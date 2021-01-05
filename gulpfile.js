var gulp = require("gulp");
var concat = require("gulp-concat");
var sourcemaps = require("gulp-sourcemaps");
var uglify = require("gulp-uglify-es").default;
var minifyCSS = require("gulp-csso");
var clean = require("gulp-clean");

var paths = {
	src: "src/",
	dest: "./dist",
}
gulp.task("clean", function(cb) {
	return gulp.src("dist", {read: false})
	.pipe(clean());
});
gulp.task("build", function(cb) {
	let apps = ["editor", "plotter", "helper", "grapher", "shared", "analyzer"];
	apps.forEach(function(a) { //Loop the array of apps to build
		//Build the js files
		gulp.src(paths.src + a + "/**/*.js")
		.pipe(sourcemaps.init())
		.pipe(concat(a + ".min.js"))
		.pipe(uglify())
		.pipe(sourcemaps.write("."))
		.pipe(gulp.dest(paths.dest));
		//Build the css files
		gulp.src(paths.src + a + "/**/*css")
		.pipe(sourcemaps.init())
		.pipe(concat(a + "-styles.css"))
		.pipe(minifyCSS())
		.pipe(sourcemaps.write("."))
		.pipe(gulp.dest(paths.dest));
	});
	cb();
});
gulp.task("default", gulp.series("clean", "build"));