using System;
using System.Collections.Generic;
using System.Configuration;
using System.Globalization;
using System.IO;
using System.Net.Http;
using System.Net.Http.Formatting;
using System.Net.Http.Headers;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;

using NLog;

using Quartz;

using MeteoPortal.Common.Logging;
using MeteoPortal.Entity.Core.Contract;
using MeteoPortal.Entity.Domain.Contract;
using MeteoPortal.Entity.Domain.Contract.Api;
using MeteoPortal.Entity.Dto;
using MeteoPortal.Etl.MoeskJobs.Contracts;
using MeteoPortal.Etl.Service.Core.Impl;

namespace MeteoPortal.Etl.Jobs
{
	[DisallowConcurrentExecution]
	public class SendLayerInteractionJob : EtlJobBase, IJob
	{
		private static readonly object Locker = new object();

		private static readonly Logger Logger = LogManager.GetLogger(EventSources.EtlService);

		private static Regex coorRegex = new Regex(
			"\\s*(:?[\\d\\.]+)\\s+(:?[\\d\\.]+)",
			RegexOptions.IgnoreCase | RegexOptions.Multiline | RegexOptions.CultureInvariant | RegexOptions.Compiled);

		private static Regex polygonRegex = new Regex(
			"\\(?\\s*\\d[^\\)]+",
			RegexOptions.IgnoreCase | RegexOptions.Multiline | RegexOptions.CultureInvariant | RegexOptions.Compiled);

		private readonly IUnitOfWork _unitOfWork;

		private readonly ISqlApiService _sqlApiService;

		private readonly ILayerInteractionExportRepository _layerInteractionExportRepository;

		private readonly ILayerInteractionRepository _layerInteractionRepository;

		private readonly ILayerInteractionConditionRepository _layerInteractionConditionRepository;

		private readonly JsonMediaTypeFormatter _jsonMediaTypeFormatter = new JsonMediaTypeFormatter
																																				{
																																					SerializerSettings =
																																						new JsonSerializerSettings
																																							{
																																								DateFormatHandling = DateFormatHandling.MicrosoftDateFormat
																																							}
																																				};

		public SendLayerInteractionJob(IUnitOfWork unitOfWork, ISqlApiService sqlApiService, ILayerInteractionExportRepository layerInteractionExportRepository, ILayerInteractionRepository layerInteractionRepository, ILayerInteractionConditionRepository layerInteractionConditionRepository)
		{
			_unitOfWork = unitOfWork;
			_sqlApiService = sqlApiService;
			_layerInteractionExportRepository = layerInteractionExportRepository;
			_layerInteractionRepository = layerInteractionRepository;
			_layerInteractionConditionRepository = layerInteractionConditionRepository;
		}

		public void Execute(IJobExecutionContext context)
		{
			lock (Locker)
			{
				ExecuteImpl().Wait();
			}
		}

		public override ITrigger Init()
		{
			var cron = ConfigurationManager.AppSettings["SendLayerInteraction.job.cron"] ?? "0 30 * * * ?";
			var result = TriggerBuilder.Create().WithCronSchedule(cron).Build();
			return result;
		}

		private static HttpClient CreateHttpClient()
		{
			HttpClient client = new HttpClient { BaseAddress = new Uri(ConfigurationManager.AppSettings["SendLayerInteraction.job.url"]) };
			client.DefaultRequestHeaders.Accept.Clear();
			client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
			client.DefaultRequestHeaders.Add("APP_KEY", ConfigurationManager.AppSettings["SendLayerInteraction.job.AppKey"] ?? "TEST");
			return client;
		}

		private static string ReadHeaderWkt(StringReader sr)
		{
			var sb = new StringBuilder();

			do
			{
				sb.Append((char)sr.Peek());
			}
			while (sr.Read() > 0 && (char)sr.Peek() != '(');

			return sb.ToString().Trim();
		}

		private async Task ExecuteImpl()
		{
			while (true)
			{
				Logger.Trace("Рассылка пересечений слоёв");
				var client = CreateHttpClient();
				var tran = _unitOfWork.BeginTran();
				try
				{
					var cancellationToken = new CancellationToken();
					var forExport = await _sqlApiService.GetLayerInteractionForExport(cancellationToken);

					if (forExport.Length == 0)
					{
						break;
					}

					foreach (var export in forExport)
					{
						try
						{
							export.LastSendDate = DateTime.Now;

							var layerInteraction = await _layerInteractionRepository.GetByIdAsync(cancellationToken, export.LayerInteractionId);

							var conditions = await _layerInteractionConditionRepository.GetForDescriptorWithResource(
								cancellationToken,
								layerInteraction.LayerInteractionDescriptorId);

							var customLayerId = 0;
							foreach (var c in conditions)
							{
								if (c.Resource1 is CustomLayer)
								{
									customLayerId = c.Resource1Id;
									break;
								}

								if (c.Resource2 is CustomLayer)
								{
									customLayerId = c.Resource2Id;
									break;
								}
							}

							var wkt = export.Intersection.AsText();

							GeoFilledRegion[] regions = ParseWkt(wkt, export.LocationId.GetValueOrDefault());

							if (regions.Length > 0)
							{
								HazardModel hm = new HazardModel
								{
									Id = export.Id,
									CustomLayerId = customLayerId,
									LayerInteractionDescriptorId = export.LayerInteractionId,
									ForecastDate = layerInteraction.ForecastDate,
									Duration = 0,
									CreateDate = layerInteraction.CreateDate,
									EventDate = layerInteraction.FactDate,
									GeoFilledRegions = regions
								};

								var result = await client.PostAsync("api/Hazards", hm, _jsonMediaTypeFormatter, cancellationToken);
								if (!result.IsSuccessStatusCode)
								{
									throw new Exception(result.StatusCode.ToString());
								}

								Logger.Info("Пересечение отправлено {0}", export.Id);
							}
							else
							{
								Logger.Warn("Пересечение не отправлено (пустое пересечение) {0}", export.Id);
							}

							export.Sended = true;
						}
						catch (Exception ex)
						{
							export.Sended = false;
							Logger.ErrorException(ex.Message, ex);
						}
						finally
						{
							if (export.Id == 0)
							{
								_layerInteractionExportRepository.Add(export);
							}
							else
							{
								_layerInteractionExportRepository.Update(export);
							}

							_unitOfWork.SaveChanges();
						}
					}
				}
				catch (Exception ex)
				{
					tran.Rollback();
				}
				finally
				{
					tran.Commit();
				}
			}
		}

		private GeoFilledRegion[] ParseWkt(string wkt, Guid resId)
		{
			var result = new List<GeoFilledRegion>();
			wkt = wkt.Trim();
			var sr = new StringReader(wkt);

			var rootType = ReadHeaderWkt(sr);
			if (rootType.Equals("MULTIPOLYGON", StringComparison.OrdinalIgnoreCase))
			{
				GeoFilledRegion polygon = ReadPolygon(sr, resId);
				while (polygon != null)
				{
					result.Add(polygon);
					polygon = ReadPolygon(sr, resId);
				}
			}

			if (rootType.Equals("POLYGON", StringComparison.OrdinalIgnoreCase))
			{
				GeoFilledRegion polygon = ReadPolygon(sr, resId);
				result.Add(polygon);
			}

			return result.ToArray();
		}

		private GeoFilledRegion ReadPolygon(StringReader sr, Guid resId)
		{
			var sb = new StringBuilder();
			int cc = 0;
			while (sr.Read() > 0)
			{
				if ((char)sr.Peek() == '(')
				{
					cc = 1;
					break;
				}

				if ((char)sr.Peek() == ')')
				{
					return null;
				}
			}

			while (cc > 0 && sr.Read() > 0)
			{
				if ((char)sr.Peek() == '(')
				{
					cc++;
				}

				if ((char)sr.Peek() == ')')
				{
					cc--;
				}

				sb.Append((char)sr.Peek());
			}

			GeoFilledRegion gfr = new GeoFilledRegion { ResId = resId };

			List<IEnumerable<GeoPoint>> holes = new List<IEnumerable<GeoPoint>>();
			gfr.HolesList = holes;

			var matches = polygonRegex.Matches(sb.ToString());
			foreach (Match match in matches)
			{
				var polyText = match.Groups[0].Value;
				var coordsMatches = coorRegex.Matches(polyText);
				List<GeoPoint> coords = new List<GeoPoint>();
				foreach (Match coord in coordsMatches)
				{
					coords.Add(new GeoPoint
											{
												X = double.Parse(coord.Groups[1].Value, CultureInfo.InvariantCulture),
												Y = double.Parse(coord.Groups[2].Value, CultureInfo.InvariantCulture)
											});
				}

				if (gfr.OuterLine == null)
				{
					gfr.OuterLine = coords;
				}
				else
				{
					holes.Add(coords);
				}
			}

			return gfr;
		}
	}
}