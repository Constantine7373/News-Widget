let gulp = require('gulp');
let gulpLoadPlugins = require('gulp-load-plugins');
let yargs = require('yargs');
let babel = require('gulp-babel');
let rigger = require('gulp-rigger');
// let cssbeautify = require('gulp-cssbeautify');
let beautify = require('gulp-beautify');
let imageminMozjpeg = require('imagemin-mozjpeg');
let path;
let emittyPug;
let errorHandler;
var jsonServer = require("gulp-json-srv");
var jsonSrv = jsonServer.create();
let argv = yargs.default({
    cache: true,
    ci: false,
    debug: true,
    fix: false,
    minify: false,
    minifyHtml: null,
    minifyCss: null,
    minifyJs: null,
    minifySvg: null,
    notify: true,
    open: true,
    port: 9000,
    spa: false,
    throwErrors: false,
}).argv;
argv.minify = !!argv.minify;
argv.minifyHtml = argv.minifyHtml !== null ? !!argv.minifyHtml : argv.minify;
argv.minifyCss = argv.minifyCss !== null ? !!argv.minifyCss : argv.minify;
argv.minifyJs = argv.minifyJs !== null ? !!argv.minifyJs : argv.minify;
argv.minifySvg = argv.minifySvg !== null ? !!argv.minifySvg : argv.minify;
if (argv.ci) {
    argv.cache = false;
    argv.notify = false;
    argv.open = false;
    argv.throwErrors = true;
}
let $ = gulpLoadPlugins({
    overridePattern: false,
    pattern: [
        'autoprefixer',
        'browser-sync',
        'cssnano',
        'emitty',
        'merge-stream',
        'postcss-reporter',
        'postcss-scss',
        'vinyl-buffer'
    ],
    scope: [
        'dependencies',
        'devDependencies',
        'optionalDependencies',
        'peerDependencies',
    ],
});
if (argv.throwErrors) {
    errorHandler = false;
} else if (argv.notify) {
    errorHandler = $.notify.onError('<%= error.message %>');
} else {
    errorHandler = null;
}

function svgoConfig(minify = argv.minifySvg) {
    return (file) => {
        if (!path) {
            path = require('path');
        }
        let filename = path.basename(file.relative, path.extname(file.relative));
        return {
            js2svg: {
                pretty: !minify,
                indent: '\t',
            },
            plugins: [{
                    cleanupIDs: {
                        minify: true,
                        prefix: `${filename}-`,
                    },
                },
                {
                    removeTitle: true,
                },
                {
                    sortAttrs: true,
                },
            ],
        };
    };
}
gulp.task("jsonSrv", function() {
    return gulp.src("src/resources/js/db.json")
        .pipe(jsonSrv.pipe());
});
gulp.task('copy', () => {
    return gulp.src([
            'src/resources/**/*.*',
            'src/resources/**/.*',
            '!src/resources/**/.keep',
        ], {
            base: 'src/resources',
            dot: true,
        })
        .pipe($.if(argv.cache, $.newer('build')))
        .pipe($.if(argv.debug, $.debug()))
        .pipe(gulp.dest('build'));
});
gulp.task('images', () => {
    return gulp.src('src/images/**/*.*')
        .pipe($.plumber({
            errorHandler,
        }))
        .pipe($.if(argv.cache, $.newer('build/images')))
        .pipe($.if(argv.debug, $.debug()))
        .pipe($.imagemin([
            $.imagemin.gifsicle({
                interlaced: true,
            }),
            $.imagemin.optipng({
                optimizationLevel: 5,
            }),
            $.imagemin.svgo(svgoConfig()),
        ]))
        .pipe(gulp.dest('build/images'));
});
gulp.task('svgOptimize', () => {
    return gulp.src('src/images/**/*.svg', {
            base: 'src/images',
        })
        .pipe($.plumber({
            errorHandler,
        }))
        .pipe($.if(argv.debug, $.debug()))
        .pipe($.svgmin(svgoConfig(false)))
        .pipe(gulp.dest('src/images'));
});
gulp.task('html', () => {
    return gulp.src('src/**/*.html')
        .pipe($.plumber({
            errorHandler,
        }))
        .pipe($.if(argv.debug, $.debug()))
        .pipe(gulp.dest('build'));
});
gulp.task('scss', () => {
    return gulp.src([
            'src/scss/*.scss',
            '!src/scss/_*.scss',
        ])
        .pipe($.plumber({
            errorHandler,
        }))
        .pipe($.if(argv.debug, $.debug()))
        .pipe($.sourcemaps.init())
        .pipe($.sass().on('error', $.sass.logError))
        .pipe($.postcss([
            argv.minifyCss ?
            $.cssnano({
                autoprefixer: {
                    add: true,
                    browsers: ['> 0.5%', 'last 6 versions', 'Firefox ESR'],
                },
                calc: true,
                discardComments: false,
                zindex: false,
            }) :
            $.autoprefixer({
                add: true,
                browsers: ['> 0.5%', 'last 6 versions', 'Firefox ESR'],
            })
        ]))
        .pipe($.sourcemaps.write('.'))
        .pipe(beautify.css({ indent_size: 4 }))
        // .pipe(cssbeautify({
        //     autosemicolon: true
        // }))        
        .pipe(gulp.dest('build/css'))
        .pipe($.browserSync.stream());
});
gulp.task('js', () => {
    return gulp.src('src/js/main.js')
        .pipe($.plumber({
            errorHandler,
        }))
        .pipe(babel({
            presets: ['@babel/preset-env', { "sourceType": "script" }],
        }))
        .pipe(beautify({
            indent_size: 4
        }))
        .pipe(rigger())
        .pipe(gulp.dest('build/js'));
});
gulp.task('watch', () => {
    gulp.watch([
        'src/resources/**/*.*',
        'src/resources/**/.*',
    ], gulp.series('copy'));
    gulp.watch('src/images/**/*.*', gulp.series('images'));
    gulp.watch([
        'src/**/*.html',
    ], {
        delay: 0,
    }, gulp.series('html'));
    gulp.watch('src/scss/**/*.scss', gulp.series('scss'));
    gulp.watch('src/js/**/*.js', gulp.series('js'));
    gulp.watch('src/resources/js/db.json', gulp.series('jsonSrv'));
});
gulp.task('serve', () => {
    let middleware = [];
    $.browserSync
        .create()
        .init({
            injectChanges: true,
            notify: false,
            open: argv.open,
            port: argv.port,
            files: [
                './build/**/*',
            ],
            server: {
                baseDir: './build',
                middleware,
            },
        });
});
gulp.task('build', gulp.parallel(
    'copy',
    'images',
    'html',
    'scss',
    'js'
));
gulp.task('default', gulp.series(
    'build',
    gulp.parallel(
        'watch',
        'serve',
        'jsonSrv'
    )
));