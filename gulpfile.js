'use strict';

const gulp = require('gulp');

let exec = require('child_process').exec;

let path         = '/var/www/test/deploy/';
let sharedPath   = path + 'shared/';
let releasesPath = path + 'releases/';
let repository   = 'git@github.com:vitalypanait/test.git';
let branch       = 'master';

let releaseName;
let commit;
let currentRelease;

function addZero(value) {
	return (parseInt(value, 10) < 10 ) ? '0' + value : value;
}

gulp.task('deploy:prepare:init', cb => {
	exec(`mkdir -p ${path} && mkdir -p ${releasesPath} && mkdir -p ${sharedPath}`, (err) => {
		cb(err);
	});
});

gulp.task('deploy:prepare:commit', cb => {
	exec(`git ls-remote ${repository} ${branch}`, (err, stdout) => {
		commit = stdout.split('\t')[0];

		if (commit.length === 0) {
			cb('Empty commit');
		}

		cb(err);
	});
});

gulp.task('deploy:prepare:get', cb => {
	let cmd = `if [ -d ${sharedPath}cached-copy ] ; then ` +
		`cd ${sharedPath}cached-copy && ` +
		`git remote set-url origin ${repository} && ` +
		`git fetch -q origin && ` +
		`git fetch --tags -q origin && ` +
		`git reset -q --hard ${commit} && ` +
		`git clean -q -d -f; ` +
		`else ` +
		`git clone -q ${repository} ${sharedPath}cached-copy && ` +
		`cd ${sharedPath}cached-copy && ` +
		`git checkout -q -b deploy ${commit}; ` +
		`fi`;

	exec(cmd, err => {
		cb(err);
	});
});

gulp.task('deploy:prepare:release', cb => {
	let now  = new Date();
	let data = [
		now.getFullYear(),
		addZero(now.getMonth() + 1),
		addZero(now.getDate()),
		addZero(now.getHours()),
		addZero(now.getMinutes()),
		addZero(now.getSeconds())
	];

	releaseName = data.join('');

	exec(`cd ${releasesPath} && mkdir ${releaseName}`, err => {
		cb(err);
	});
});

gulp.task('deploy:sync', cb => {
	exec(`rsync -a ${sharedPath}cached-copy/ ${releasesPath}${releaseName}/ --exclude=".git"`, err => {
		cb(err);
	});
});

gulp.task('deploy:info', cb => {
	let goToRelease = `cd ${releasesPath}${releaseName}`;
	let cmd         = `${goToRelease} && echo '${branch}' > ./BRANCH && ` +
		`${goToRelease} && echo ${commit} > ./REVISION && ` +
		`${goToRelease} && echo ${releaseName} > ./RELEASE && ` +
		`${goToRelease} && touch TRANSACTION`;

	exec(cmd, err => {
		cb(err);
	});
});

gulp.task('deploy:symlink', cb => {
	console.log(`ln -nfsv ${releasesPath}${releaseName} ${path}current`);

	exec(`[ -e ${releasesPath}${releaseName} ] && ln -nfsv ${releasesPath}${releaseName} ${path}current`, err => {
		cb(err);
	});
});

gulp.task('deploy:transaction', (cb) => {
	exec(`cd ${releasesPath}${releaseName} && echo "SUCCESS" > ./TRANSACTION`, (err) => {
		cb(err);
	});
});

gulp.task('rollback:find', cb => {
	exec(`cat ${path}current/RELEASE`, (err, stdout) => {
		currentRelease = stdout.split('\n')[0];

		console.log(currentRelease);

		cb(err);
	});
});

gulp.task('rollback:set', (cb) => {
	exec(`find ${path} -not -empty -type f -name TRANSACTION`, (err, stdout) => {
		let directories = stdout.split('\n');

		if (directories.length === 0) {
			cb('Can not find release to rollback');
		}

		directories.reverse().forEach((item, key, arr) => {
			item = (item.split('/TRANSACTION')[0]).split('releases/')[1];

			arr[key] = item === undefined ? '' : item;
		});

		releaseName = currentRelease;

		let isFindCurrent = false;

		directories.some(item => {
			if (isFindCurrent) {
				releaseName = item;

				return true;
			}

			if (item === currentRelease) {
				isFindCurrent = true;
			}
		});

		if (releaseName.length === 0) {
			cb('Can not find release to rollback');
		}

		console.log(releaseName);

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
	'deploy:symlink',
	'deploy:transaction'
));

gulp.task('rollback', gulp.series(
	'rollback:find',
	'rollback:set',
	'deploy:symlink'
));