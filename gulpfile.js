const gulp = require("gulp");
const concat = require("gulp-concat");
const sourcemaps = require("gulp-sourcemaps");
const uglify = require("gulp-uglify-es").default;
const minifyCSS = require("gulp-csso");
const clean = require("gulp-clean");
const zip = require("gulp-zip");
const rename = require("gulp-rename");
const mergeStream = require("merge-stream");

var paths = {
	src: "src/",
	dest: "./dist",
}
gulp.task("clean", function(cb) {
	return gulp.src("dist/*", {read: false})
	.pipe(clean());
});
gulp.task("build", function(cb) {
	//let apps = ["editor", "plotter", "helper", "grapher", "shared", "analyzer", "ui"];
	let apps = ["editor", "shared", "analyzer", "ui"];
	apps.forEach(function(a) { //Loop the array of apps to build
		//Build the js files
		gulp.src(paths.src + a + "/**/*.js")
		.pipe(sourcemaps.init())
		.pipe(concat(a + ".min.js"))
		.pipe(uglify())
		.pipe(sourcemaps.write("."))
		.pipe(gulp.dest(paths.dest));
		//Build the css files
		gulp.src(paths.src + a + "/**/*.css")
		.pipe(sourcemaps.init())
		.pipe(concat(a + "-styles.css"))
		.pipe(minifyCSS())
		.pipe(sourcemaps.write("."))
		.pipe(gulp.dest(paths.dest));
	});
	cb();
});
gulp.task("release", function(cb) {
	let folders = ["dependencies", "dist", "images"];
	let stream = mergeStream();
	folders.forEach(function(f) {
		stream.add(
			gulp.src(f + "/*")
			.pipe(rename(function(file) {
				file.dirname = f + '/' + file.dirname;
			}))
		);
	});
	stream.add(
		gulp.src("Editor.html")
	);
	stream.pipe(zip("Release.zip"))
	.pipe(gulp.dest(paths.dest));
	cb();
});
gulp.task("default", gulp.series("clean", "build"));