import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { ApplicationService } from '../../../app.service';
import { routes, ApiResponse, Resources, ApplicationBlock } from '../models';
import { isArray } from 'util';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    private ignoredUrls = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private appService: ApplicationService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<any> {
        this.appService.error = null;
        this.appService.internalServerError = null;
        const requestCopy = request.clone();
        return next.handle(request).pipe(
            // handle error response
            catchError(err => {
                const index = this.ignoredUrls.findIndex((value) => { return err.url == value; });
                if (index != -1)
                    return throwError(err);

                if (err.status === 401) {
                    // auto logout if 401 response returned from api
                    this.appService.onLoginReturnUrl = this.router.url;
                    this.appService.onLoginQueryParams = this.route.snapshot.queryParams;
                    this.router.navigate([routes.login], { skipLocationChange: true });
                    return of([]);
                }

                if (err.status === 500) {
                    this.appService.progress = null;
                    this.appService.internalServerError = err.error != null && err.error.exceptionMessage != null ? err.error.exceptionMessage : "Внутренняя ошибка сервера";
                    this.router.navigateByUrl(routes.serverError, { skipLocationChange: true });
                    return of([]);
                }

                let errorMessage = 'Произошла ошибка:';
                if (err.error && err.error.errors && err.error.errors.length > 0) {
                    this.appService.errors = this.parseErrors(err.error.errors);
                    return throwError(err);
                }
                else if (err.error && err.error.errorDescription)
                    errorMessage = `${errorMessage} ${err.error.errorDescription}`;
                else if (err.error && err.error.exceptionMessage)
                    errorMessage = `${errorMessage} ${err.error.exceptionMessage}`;
                else if (err.error && err.error.message)
                    errorMessage = `${errorMessage} ${err.error.message}`;
                else if (err.message)
                    errorMessage = `${errorMessage} ${err.message}`;
                else
                    errorMessage = `${errorMessage} ${err.statusText}`;

                this.appService.error = errorMessage;
                return throwError(err);
            }),
            // handle ApiResponse errors
            map((response: HttpResponse<any>) => {
                if (response.status !== 200) {
                    return response;
                }

                const body = response.body;

                if (body && body.result === false && body.resultData && body.resultData.block) {
                    if (body.resultData.block == "PersonBlock") {
                        this.appService.error = body.resultData.message;
                        throw new HttpErrorResponse({
                            error: Resources.ErrorText.SERVER_DEFAULT,
                            headers: response.headers,
                            status: 500,
                            statusText: 'Error',
                            url: response.url
                        });
                    } else {
                        let title = "Ошибка!";
                        switch (body.resultData.block) {
                            case "AppBlock":
                                title ="Заявка неактивна";
                                break;
                            case "PhoneNotRegistered":
                                title ="Некорректный номер телефона";
                                break;
                            case "PersonFinorgBlock":
                                title ="Учетная запись заблокирована";
                                break;
                        }

                        this.appService.block = new ApplicationBlock(title, body.resultData.message);
                        this.appService.progress = null;
                        this.router.navigate([routes.denied], { skipLocationChange: true });
                    }
                } else if (
                    body && body.result === false &&
                    isArray(body.errors) && body.errors.length > 0
                ) {
                    this.appService.error = body.errors[0].errorDescription;
                    throw new HttpErrorResponse({
                        error: body.errors[0].errorDescription,
                        headers: response.headers,
                        status: 500,
                        statusText: 'Error',
                        url: response.url
                    });
                } else if (body && body.result === false) {
                    this.appService.error = Resources.ErrorText.SERVER_DEFAULT;
                    throw new HttpErrorResponse({
                        error: Resources.ErrorText.SERVER_DEFAULT,
                        headers: response.headers,
                        status: 500,
                        statusText: 'Error',
                        url: response.url
                    });
                }

                return response;
            })
        );
    }

    private parseErrors(errors): string[] {
        if (!isArray(errors))
            return null;

        let result = [];
        let index = 0;
        while (index < errors.length) {
            const err = errors[index];
            if (err.errorCode && err.errorDescription) {
                const code = this.translateErrorCode(err.errorCode);
                result.push(
                    err.errorDescription === "Required"
                        ? "Не заполнено поле \"" + code + "\""
                        : code + ": " + err.errorDescription
                );
            }

            index++;
        }

        return result;
    }

    private translateErrorCode(code: string): string {
        if (code.startsWith("LiveAddressDadata"))
            return "Адрес проживания";

        if (code.startsWith("RegAddressDadata"))
            return "Адрес регистрации";

        switch (code) {
            case "BirthDate":
                return "Дата рождения";
            case "BirthPlace":
                return "Место рождения";
            case "ChildCount":
                return "Количество детей";
            case "Code":
                return "Код подразделения";
            case "CohabitationTypeId":
                return "Совместное проживание с родственниками";
            case "CompanySphereId":
                return "Сфера деятельности компании";
            case "CompanyTitle":
                return "Название организации";
            case "ContactFirstName":
                return "Имя контактного лица";
            case "ContactLastName":
                return "Фамилия контактного лица";
            case "ContactMiddleName":
                return "Отчество контактного лица";
            case "ContactPhone":
                return "Телефон контактного лица";
            case "ContactRelationId":
                return "Отношение контактного лица к заёмщику";
            case "DateArrival":
                return "Дата начала проживания";
            case "DepartmentId":
                return "Подразделение";
            case "EducationId":
                return "Образование";
            case "Email":
                return "Электронная почта";
            case "Emitent":
                return "Кем выдан паспорт";
            case "FirstName":
                return "Имя";
            case "Gender":
                return "Пол";
            case "IssueDate":
                return "Дата выдачи паспорта";
            case "IsSpouseAsContact":
                return "Контактное лицо"
            case "JobPhone":
                return "Рабочий телефон";
            case "JobStart":
                return "Дата начала работы";
            case "JobTypeId":
                return "Тип занятости";
            case "LastName":
                return "Фамилия";
            case "LiveAddress":
            case "LiveAddressDadata":
                return "Адрес проживания";
            case "LiveFlat":
                return "Номер квартиры";
            case "LivePhone":
                return "Телефон";
            case "MaritalStatusId":
                return "Семейное положение";
            case "MiddleName":
                return "Отчество";
            case "MonthExpense":
                return "Доход";
            case "Number":
                return "Номер паспорта";
            case "Position":
                return "Должность";
            case "ProfitMonth":
                return "Расход";
            case "RegAddress":
            case "RegAddressDadata":
                return "Адрес регистрации";
            case "RegFlat":
                return "Квартира";
            case "RegPhone":
                return "Телефон";
            case "RegistrationDate":
                return "Дата регистрации";
            case "Series":
                return "Серия паспорта";
            case "SpouseBirthDate":
                return "Дата рождения супруга";
            case "SpouseFirstName":
                return "Имя супруга";
            case "SpouseLastName":
                return "Фамилия супруга";
            case "SpouseMarriageDate":
                return "Дата вступления в брак";
            case "SpouseMiddleName":
                return "Отчество супруга";
            case "UniquePhone":
                return "Телефон";
            case "WorkAddress":
            case "WorkAddressDadata":
                return "Рабочий адрес";
            case "WorkExpId":
            case "WorkExperienceId":
                return "Опыт работы";
            default:
                return code;
        }
    } 
}
