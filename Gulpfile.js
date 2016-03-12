var gulp = require('gulp');
var sass = require('gulp-sass');

gulp.task('styles', function () {
    gulp.src('src/**/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('./dist/'));
});

gulp.task('copy', function () {
    return gulp
        .src('src/**/*.{js,html,png,json}')
        .pipe(gulp.dest('dist'));
});

//Watch task
gulp.task('default', ['copy', 'styles'], function () {
    gulp.watch('src/**/*.scss', ['styles']);
    gulp.watch('src/**/*.{js,html,png,json}', ['copy']);
});
