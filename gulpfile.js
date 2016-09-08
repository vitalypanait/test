'use strict';

const gulp = require('gulp');

var exec = require('child_process').exec;

var path         = '/var/www/test/deploy/';
var sharedPath   = path + 'shared/';
var releasesPath = path + 'releases/';
var repository   = 'git@github.com:vitalypanait/test.git'
var branch       = 'master';


var releaseName;
var commit;

function addZero(value) {
	return (parseInt(value, 10) < 10 ) ? '0' + value : value;
}


gulp.task('deploy:prepare:init', function(cb) {
	exec('mkdir -p ' + path + ' && mkdir -p ' + releasesPath + ' && mkdir -p ' + sharedPath, function (err) {
		cb(err);
	});
});

gulp.task('deploy:prepare:commit', function(cb) {
	exec('git ls-remote ' + repository +  ' ' + branch, function(err, stdout) {
		commit = stdout.split('\t')[0];

		if (commit.length === 0) {
			cb('Empty commit');
		}

		cb(err);
	});
});

gulp.task('deploy:prepare:get', function(cb) {
	var cmd = 'if [ -d ' + sharedPath + 'cached-copy ] ; then ' +
		'cd ' + sharedPath + 'cached-copy && ' +
		'git remote set-url origin ' + repository + ' && ' +
		'git fetch -q origin && ' +
		'git fetch --tags -q origin && ' +
		'git reset -q --hard ' + commit + ' && ' +
		'git clean -q -d -f; ' +
		'else ' +
		'git clone -q ' + repository + ' ' + sharedPath + 'cached-copy && ' +
		'cd ' + sharedPath + 'cached-copy && ' +
		'git checkout -q -b deploy ' + commit + '; ' +
		'fi';

	exec(cmd, function (err) {
		cb(err);
	});
});

gulp.task('deploy:prepare:release', function(cb) {
	var now         = new Date();
	var data = [
		now.getFullYear(),
		addZero(now.getMonth() + 1),
		addZero(now.getDate()),
		addZero(now.getHours()),
		addZero(now.getMinutes()),
		addZero(now.getSeconds())
	];

	releaseName = data.join('');

	exec('cd ' + releasesPath + ' && mkdir ' + releaseName, function(err) {
		cb(err);
	})
});

gulp.task('deploy:sync', function(cb) {
	exec('rsync -a ' + sharedPath + 'cached-copy/ ' + releasesPath + releaseName + '/ --exclude=".git"', function(err) {
		cb(err);
	})
});

gulp.task('deploy:info', function(cb) {
	var goToRelease = 'cd ' + releasesPath + releaseName;
	var cmd         = goToRelease + ' && echo \'' + branch + '\' > ./BRANCH && ' +
		goToRelease + ' && echo ' + commit + ' > ./REVISION && ' +
		goToRelease + ' && echo ' + releaseName + ' > ./RELEASE';

	exec(cmd, function(err) {
		cb(err);
	})
});

gulp.task('deploy:symlink', function(cb) {
	exec('ln -nfsv ' + releasesPath + releaseName + ' ' + path + 'current', function(err) {
		cb(err);
	})
});

var currentRelease;

gulp.task('rollback:find', function(cb) {
	exec('cat ' + path + 'current/RELEASE ', function(err, stdout) {
		currentRelease = stdout.split('\n')[0];

		cb(err);
	});
});

gulp.task('rollback:get', function(cb) {
	exec('cd /var/www/test/deploy/releases/ && ls -trd */', function(err, stdout) {
		var directories = stdout.split('\n');

		if (directories.length === 0) {
			cb('Empty elder release');
		}

		var isFindCurrent = false;
		var rollbackRelease = current;

		directories.some(function(item) {
			console.log(item);
			if (isFindCurrent) {
				rollbackRelease = item;

				return true;
			}

			if (item === currentRelease) {
				isFindCurrent = true;
			}
		});

		console.log('Rollback release = ' + rollbackRelease);

		cb(err);
	});
});

gulp.task('deploy', gulp.series(
	'deploy:prepare:init',
	'deploy:prepare:commit',
	'deploy:prepare:get',
	'deploy:prepare:release',
	'deploy:sync',
	'deploy:info',
	'deploy:symlink'
));