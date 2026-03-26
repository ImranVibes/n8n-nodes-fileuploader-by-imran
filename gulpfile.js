const gulp = require('gulp');
const path = require('path');

function buildIcons() {
	return gulp.src('nodes/**/*.json').pipe(gulp.dest('dist'));
}

exports.default = buildIcons;
