'use strict';

const gulp = require('gulp');

var exec = require('child_process').exec;
var path = '/var/www/test/deploy';
var repositoryUrl = 'git@github.com:vitalypanait/test.git';
var last;

gulp.task('init', function(cb) {
	exec('mkdir -p ' + path + ' && mkdir -p ' + path + '/releases && mkdir -p ' + path + '/shared', function (err) {
		cb(err);
	});
});

gulp.task('check', function(cb) {
	exec("ls -tr " + path +"/releases/ |tail -1 |awk '{print $NF}'", function (err, stdout) {
		last = stdout;
		cb(err);
	});
});

gulp.task('git', function(cb) {
	var cmd = 'if [ -d /var/www/test/deploy/shared/cached-copy ] ; then ' +
		'cd ' + path + '/shared/cached-copy && ' +
		'git remote set-url origin ' + repositoryUrl + ' && ' +
		'git fetch -q origin && ' +
		'git fetch --tags -q origin && ' +
		'git clean -q -d -f && ' +
		'git branch; ' +
		'else  ' +
		'git clone -q ' + repositoryUrl + ' ' + path + '/shared/cached-copy && ' +
		'cd ' + path + '/shared/cached-copy && ' +
		'git checkout -q -b deploy; ' +
		'fi';
	//'echo 1; ' +
	//'cd ' + path + '/shared/cached-copy && ' +
	//'git remote set-url origin git@github.com:vitalypanait/test.git && ' +
	//'git fetch -q origin && ' +
	//'git fetch --tags -q origin && ' +
	//'git clean -q -d -f; ' +
	//'else ' +
	//'git clone -q git@github.com:vitalypanait/test.git ' + path + '/shared/cached-copy && ' +
	//'cd ' + path + '/shared/cached-copy && ' +
	//'ls -la; ' +
	//'echo 2; ' +
	//'fi';

	exec(cmd, function (err, stdout) {

		console.log(stdout);
	//'mkdir $( date +%Y-%m-%d-%H-%M-%S )'

		cb(err);
	});
});


gulp.task('deploy', gulp.series('init', 'git'));