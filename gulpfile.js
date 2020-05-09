/*!
 * Milan Aryal Gulpfile (https://milanaryal.com.np)
 * Copyright 2020 Milan Aryal
 * Licensed under MIT (https://github.com/MilanAryal/milanaryal.github.io/blob/master/LICENSE)
 */

'use strict';

// Load plugin(s)
const { src, dest, series, parallel, watch } = require('gulp');
const del = require('del');
const rename = require('gulp-rename');
const header = require('gulp-header');
const pkg = require('./package.json');
const sass = require('gulp-sass');
sass.compiler = require('node-sass');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const discardComments = require('postcss-discard-comments');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify-es').default;
const browserSync = require('browser-sync').create();
const cp = require('child_process');

// Paths to project folders
var paths = {
  styles: {
    src: 'src/scss/main.scss',
    dest: 'assets/css/',
    include: '_includes/css/',
  },
  scripts: {
    src: [
      'src/js/vendor/jquery.js',
      'src/js/vendor/popper.js',
      'src/js/vendor/bootstrap/util.js',
      // 'src/js/vendor/bootstrap/alert.js',
      // 'src/js/vendor/bootstrap/button.js',
      // 'src/js/vendor/bootstrap/carousel.js',
      'src/js/vendor/bootstrap/collapse.js',
      // 'src/js/vendor/bootstrap/dropdown.js',
      // 'src/js/vendor/bootstrap/modal.js',
      // 'src/js/vendor/bootstrap/scrollspy.js',
      // 'src/js/vendor/bootstrap/tab.js',
      'src/js/vendor/bootstrap/tooltip.js',
      // 'src/js/vendor/bootstrap/popover.js',
      'src/js/vendor/nprogress.js',
      'src/js/vendor/headroom.js',
      'src/js/vendor/jQuery.headroom.js',
      'src/js/scripts.js',
      'src/js/console.log.js'
    ],
    dest: 'assets/js/'
  },
  jekyll: {
    src: [
      '_includes/**/*.html',
      '_layouts/**/*.html',
      '_pages/**',
      '_posts/**',
      'writings/index.html'
    ],
    dest: '_site/',
    css: '_site/assets/css/',
    js: '_site/assets/js/'
  }
};

// Banner template for files header
var banner = ['/*!',
  ' * <%= pkg.title %> (<%= pkg.url %>)',
  ' * Copyright ' + new Date().getFullYear() + ' <%= pkg.author %>',
  ' * Licensed under <%= pkg.license %> (https://github.com/MilanAryal/milanaryal.github.io/blob/master/LICENSE)',
  ' */',
  ''].join('\n');


/**
 * Cleaning task(s)
 */

// Remove pre-existing content from the folders
function clean () {
  return del([ paths.styles.dest, paths.styles.include, paths.scripts.dest ]);
}

function cleanCSS () {
  return del([ paths.styles.dest, paths.styles.include ]);
}

function cleanJS () {
  return del([ paths.scripts.dest ]);
}


/**
 * Compiling & bundling task(s)
 */

 // Process and minify styles
 function css () {
   return src(paths.styles.src)
     .pipe(sass.sync({ precision: 6, outputStyle: 'expanded' }).on('error', sass.logError))
     .pipe(postcss([ autoprefixer({ cascade: false }) ]))
     .pipe(header(banner, { pkg : pkg }))
     .pipe(dest(paths.styles.dest))
     .pipe(rename({ suffix: '.min' }))
     .pipe(postcss([ cssnano(), discardComments({ removeAll: true }) ]))
     .pipe(dest(paths.styles.include))
     .pipe(header(banner, { pkg : pkg }))
     .pipe(dest(paths.styles.dest));
 }

// Concatenate and minify scripts
function js () {
  return src(paths.scripts.src)
    .pipe(concat('bundle.js'))
    .pipe(header(banner, { pkg : pkg }))
    .pipe(dest(paths.scripts.dest))
    .pipe(rename({ suffix: '.min' }))
    .pipe(uglify({ output: { comments: false } }))
    .pipe(header(banner, { pkg : pkg }))
    .pipe(dest(paths.scripts.dest));
}


/**
 * Jekyll task(s)
 */

 // Remove existing Jekyll build site contents
 function cleanSite () {
   return del([ paths.jekyll.dest ]);
 }

 // Remove style files in Jekyll site
 function cleanSiteCSS () {
   return del([ paths.jekyll.css, paths.styles.include ]);
 }

// Remove script files in Jekyll site
function cleanSiteJS () {
  return del([ paths.jekyll.js ]);
}

// Build the Jekyll site
function buildSite (done) {
  browserSync.notify('Compiling Jekyll, please wait!');
  return cp.spawn('npm', [ 'run', 'jekyll-build' ], { stdio: 'inherit' })
    .on('close', done);
}

// Wait for Jekyll build, then launch the server
// BrowserSync (callback)
function serveSite (done) {
  browserSync.init({
    port: 4000,
    ui: {
      port: 4001
    },
    server: {
      baseDir: paths.jekyll.dest
    },
    open: false
  }, done);
}

// BrowserSync Reload (callback)
function browserSyncReload (done) {
  browserSync.reload();
  done();
}

// Rebuild CSS on Jekyll site and do page reload
function siteCSS () {
  // CSS
  return src(paths.styles.src)
  .pipe(sass.sync({ precision: 6, outputStyle: 'expanded' }).on('error', sass.logError))
  .pipe(postcss([ autoprefixer({ cascade: false }) ]))
  .pipe(header(banner, { pkg : pkg }))
  .pipe(dest(paths.jekyll.css))
  .pipe(rename({ suffix: '.min' }))
  .pipe(postcss([ cssnano(), discardComments({ removeAll: true }) ]))
  .pipe(header(banner, { pkg : pkg }))
  .pipe(dest(paths.jekyll.css))
  // Auto-inject into browsers
  .pipe(browserSync.stream());
}

// Rebuild JS on Jekyll site and do page reload
function siteJS () {
    // JS
  return src(paths.scripts.src)
    .pipe(concat('bundle.js'))
    .pipe(header(banner, { pkg : pkg }))
    .pipe(dest(paths.jekyll.js))
    .pipe(rename({ suffix: '.min' }))
    .pipe(uglify({ output: { comments: false } }))
    .pipe(header(banner, { pkg : pkg }))
    .pipe(dest(paths.jekyll.js))
    // Auto-inject into browsers
    .pipe(browserSync.stream());
}


/**
 * Watching task for changes in src files
 */

// Watch changes
function watchFiles () {
  // Watch .scss files
  watch('src/scss/**/*.scss', series(cleanSiteCSS, siteCSS));
  // Watch .js files
  watch('src/js/**/*.js', series(cleanSiteJS, siteJS));
  // Watch Jekyll uncompiled files and do page reload
  watch(paths.jekyll.src, series(buildSite, browserSyncReload));
}


/**
 * Export task(s)
 */

var build = series(clean, parallel(css, js));
var buildSite = series (build, parallel(cleanSite, buildSite));
var serveSite = series(buildSite, serveSite);

// Public working task(s)
exports.buildSite = buildSite;
exports.serveSite = serveSite;
exports.watch = parallel(watchFiles, serveSite);

// Default task
exports.default = build;
