var gulp = require('gulp');
var inject = require('gulp-inject');
var series = require('stream-series');
var bom = require('gulp-bom');

let sass = require('gulp-sass');
let plumber = require('gulp-plumber');
let sourcemap = require('gulp-sourcemaps');
let mincss = require('gulp-csso');
let rename = require('gulp-rename');

gulp.task('inject', function () {
    var target = gulp.src('../Happylend.ARM/views/home/index.cshtml');
    // It's not necessary to read the files (will speed up things), we're only after their paths:
    var polyfillStream_es2015 = gulp.src(['../Happylend.ARM/front/polyfills-es2015*.js'], {read: false});
    var vendorStream_es2015 = gulp.src(['../Happylend.ARM/front/vendor-es2015*.js'], {read: false});
    var runtimeStream_es2015 = gulp.src(['../Happylend.ARM/front/runtime-es2015*.js'], {read: false});
    var mainStream_es2015 = gulp.src(['../Happylend.ARM/front/main-es2015*.js'], {read: false});
    var polyfillStream_es5 = gulp.src(['../Happylend.ARM/front/polyfills-es5*.js'], {read: false});
    var vendorStream_es5 = gulp.src(['../Happylend.ARM/front/vendor-es5*.js'], {read: false});
    var runtimeStream_es5 = gulp.src(['../Happylend.ARM/front/runtime-es5*.js'], {read: false});
    var mainStream_es5 = gulp.src(['../Happylend.ARM/front/main-es5*.js'], {read: false});

    return target.pipe(inject(series(
        polyfillStream_es2015,
        vendorStream_es2015,
        runtimeStream_es2015,
        mainStream_es2015,
        polyfillStream_es5,
        vendorStream_es5,
        runtimeStream_es5,
        mainStream_es5
    ), {
        transform: function (filename) {
            var index = filename.lastIndexOf("/");
            if (index != -1)
                filename = filename.substring(index + 1);

            if (filename.indexOf("-es2015.") != -1)
                return '<script src="@Url.Content("~/front/' + filename + '")" type="module"></script>';
            else if (filename.indexOf("-es5.") != -1)
                return '<script src="@Url.Content("~/front/' + filename + '")" nomodule></script>';
            else
                return '<script src="@Url.Content("~/front/' + filename + '")" type="text\javascript"></script>';
        }
    }))
        .pipe(bom())
        .pipe(gulp.dest('../Happylend.ARM/views/home'));
});

gulp.task('inject-client', function () {
    var target = gulp.src('../Happylend.NewClient/views/home/index.cshtml');
    // It's not necessary to read the files (will speed up things), we're only after their paths:
    var polyfillStream_es2015 = gulp.src(['../Happylend.NewClient/front/polyfills-es2015*.js'], {read: false});
    var vendorStream_es2015 = gulp.src(['../Happylend.NewClient/front/vendor-es2015*.js'], {read: false});
    var runtimeStream_es2015 = gulp.src(['../Happylend.NewClient/front/runtime-es2015*.js'], {read: false});
    var mainStream_es2015 = gulp.src(['../Happylend.NewClient/front/main-es2015*.js'], {read: false});
    var polyfillStream_es5 = gulp.src(['../Happylend.NewClient/front/polyfills-es5*.js'], {read: false});
    var vendorStream_es5 = gulp.src(['../Happylend.NewClient/front/vendor-es5*.js'], {read: false});
    var runtimeStream_es5 = gulp.src(['../Happylend.NewClient/front/runtime-es5*.js'], {read: false});
    var mainStream_es5 = gulp.src(['../Happylend.NewClient/front/main-es5*.js'], {read: false});
	var styles = gulp.src(['../Happylend.NewClient/front/styles*.css'], {read: false});

    return target
		.pipe(inject(styles, {
			starttag: '<!-- inject:head:{{ext}} -->',
			transform: function (filename) {
				var index = filename.lastIndexOf("/");
				if (index != -1)
					filename = filename.substring(index + 1);

				return '<link rel="stylesheet" href="@Url.Content("~/front/' + filename + '")" >';
			}
		}))
		.pipe(inject(series(
			polyfillStream_es2015,
			vendorStream_es2015,
			runtimeStream_es2015,
			mainStream_es2015,
			polyfillStream_es5,
			vendorStream_es5,
			runtimeStream_es5,
			mainStream_es5
    ), {
        transform: function (filename) {
            var index = filename.lastIndexOf("/");
            if (index != -1)
                filename = filename.substring(index + 1);

            if (filename.indexOf("-es2015.") != -1)
                return '<script src="@Url.Content("~/front/' + filename + '")" type="module"></script>';
            else if (filename.indexOf("-es5.") != -1)
                return '<script src="@Url.Content("~/front/' + filename + '")" nomodule></script>';
            else
                return '<script src="@Url.Content("~/front/' + filename + '")" type="text\javascript"></script>';
        }
    }))
        .pipe(bom())
        .pipe(gulp.dest('../Happylend.NewClient/views/home'));
});

gulp.task('css-arm', function () {
    return gulp.src('src/styles/style.scss')
        .pipe(plumber())
        .pipe(sourcemap.init())
        .pipe(sass())
        .pipe(mincss())
        .pipe(rename('style.min.css'))
        .pipe(sourcemap.write('.'))
        .pipe(gulp.dest('build/css'))
        .pipe(server.stream());
});

gulp.task('css-client-form', function () {
    return gulp.src('projects/src/styles/style.scss')
        .pipe(plumber())
        .pipe(sourcemap.init())
        .pipe(sass())
        .pipe(mincss())
        .pipe(rename('styles.min.css'))
        .pipe(sourcemap.write('.'))
        .pipe(gulp.dest('projects/client-form/src'));
});

gulp.task('watch-css', function() {
    gulp.watch('projects/src/styles/**/*.scss', gulp.series('css-client-form'));
});

gulp.task('watch-css-client-form', gulp.series('css-client-form', 'watch-css'));