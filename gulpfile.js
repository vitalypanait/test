'use strict';

const gulp = require('gulp');

var exec = require('child_process').exec;
var path = '/var/www/test/deploy';
var shared = '/var/www/test/deploy/shared/';
var repositoryUrl = 'git@github.com:vitalypanait/test.git';
var now = new Date();
var newReleaseName = now.getFullYear() + '' + now.getMonth() + '' + now.getDate() + '' + now.getHours() + '' + now.getMinutes() + '' + now.getSeconds();
var lastCommit;

gulp.task('init', function(cb) {
	exec('mkdir -p ' + path + ' && mkdir -p ' + path + '/releases && mkdir -p ' + path + '/shared', function (err) {
		cb(err);
	});
});

gulp.task('last_commit', function(cb) {
	exec('git ls-remote ' + repositoryUrl +  ' \'master\'', function(err, stdout) {
		lastCommit = stdout.split('\t')[0];

		if (lastCommit.length === 0) {
			cb();
		}

		cb(err);
	});
});

gulp.task('git', function(cb) {
	var cmd = 'if [ -d ' + shared + 'cached-copy ] ; then ' +
		'cd ' + shared + 'cached-copy && ' +
		'git remote set-url origin ' + repositoryUrl + ' && ' +
		'git fetch -q origin && ' +
		'git fetch --tags -q origin && ' +
		//'git pull -q origin master && ' +
		'git reset -q --hard ' + lastCommit + ' && ' +
		'git clean -q -d -f; ' +
		'else  ' +
		'git clone -q ' + repositoryUrl + ' ' + shared + 'cached-copy && ' +
		'cd ' + shared + 'cached-copy && ' +
		'git checkout -q deploy ' + lastCommit + '; ' +
		'fi';

	exec(cmd, function (err) {
		cb(err);
	});
});

gulp.task('create-release', function(cb) {
	exec('cd ' + path + '/releases && mkdir ' + newReleaseName, function(err) {
		cb(err);
	})
});

gulp.task('rsync', function(cb) {
	exec('rsync -a ' + shared + 'cached-copy/ ' + path + '/releases/' + newReleaseName + '/ --exclude=".git"', function(err) {
		cb(err);
	})
});

gulp.task('link', function(cb) {
	exec('ln -nfsv ' + path + '/releases/' + newReleaseName + ' ' + path + '/current', function(err) {
		cb(err);
	})
});




gulp.task('deploy', gulp.series('init', 'last_commit', 'git', 'create-release', 'rsync', 'link'));