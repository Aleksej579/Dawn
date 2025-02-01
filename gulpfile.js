const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const autoprefixer = require('gulp-autoprefixer');
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
const cached = require('gulp-cached');
const newer = require('gulp-newer');
const rename = require('gulp-rename');

const paths = {
  styles: {
    src: 'dev/scss/**/*.scss',
    dest: './assets',
  },
  scripts: {
    src: 'dev/js/*.js',
    dest: './assets',
  },
};

function compileStyles() {
  return gulp.src(paths.styles.src)
    .pipe(cached('sass'))
    .pipe(newer(paths.styles.dest))
    .pipe(sass({ outputStyle: 'compressed' }).on('error', sass.logError))
    .pipe(autoprefixer())
    .pipe(rename(function (path) {
      path.dirname = '';
    }))
    .pipe(gulp.dest(paths.styles.dest));
}

function compileScripts() {
  return gulp.src(paths.scripts.src)
    .pipe(cached('scripts'))
    .pipe(newer(paths.scripts.dest))
    .pipe(babel({ presets: ['@babel/preset-env'] }))
    .pipe(uglify())
    .pipe(rename(function (path) {
      path.dirname = '';
    }))
    .pipe(gulp.dest(paths.scripts.dest));
}

function watchFiles() {
  gulp.watch(paths.styles.src, compileStyles);
  gulp.watch(paths.scripts.src, compileScripts);
}

exports.default = gulp.series(
  gulp.parallel(compileStyles, compileScripts),
  watchFiles
);

exports.production = gulp.series(
  gulp.parallel(compileStyles, compileScripts)
);