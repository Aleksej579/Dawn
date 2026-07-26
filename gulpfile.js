import gulp from 'gulp';
import gulpSass from 'gulp-sass';
import * as dartSass from 'sass';
import postcss from 'gulp-postcss';
import autoprefixer from 'autoprefixer';
import babel from 'gulp-babel';
import uglify from 'gulp-uglify';
import cached from 'gulp-cached';
import changed from 'gulp-changed';
import rename from 'gulp-rename';

const sass = gulpSass(dartSass);

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
    .pipe(sass({
      style: 'compressed',
      includePaths: ['node_modules']
    }).on('error', sass.logError))
    .pipe(postcss([autoprefixer()]))
    .pipe(rename(path => {
      path.dirname = '';
    }))
    .pipe(gulp.dest(paths.styles.dest));
}

function compileScripts() {
  return gulp.src(paths.scripts.src)
    .pipe(cached('scripts'))
    .pipe(changed(paths.scripts.dest))
    .pipe(babel({ presets: ['@babel/preset-env'] }))
    .pipe(uglify())
    .pipe(rename(path => {
      path.dirname = '';
    }))
    .pipe(gulp.dest(paths.scripts.dest));
}

function watchFiles() {
  gulp.watch(paths.styles.src, compileStyles);
  gulp.watch(paths.scripts.src, compileScripts);
}

export const production = gulp.series(
  gulp.parallel(compileStyles, compileScripts)
);

export default gulp.series(
  gulp.parallel(compileStyles, compileScripts),
  watchFiles
);
