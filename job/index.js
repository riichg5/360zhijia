let fs = require('fs');
let path = require('path');
let schedule = require('node-schedule');
let IS_PROCESSING = false;
let exportObj = {};
let jobs = [];

let job = (opts) => {
	let context = opts.context;
	let queue = context.queue;
	let directory = __dirname;

    fs.readdirSync(directory).forEach((filename) => {
        let fullPath, stat, match;

        if (filename === 'index.js' || /^\./.test(filename)) {
            return;
        }

        fullPath = path.join(directory, filename);
        stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            return;
        }

        match = /(\w+)\.js$/.exec(filename);
        if (match && filename !== 'Base.js') {
            try{
            	console.log("job filename: ", filename);
            	console.log("fullPath: ", fullPath);

            	let job = null;
            	let obj = require(fullPath);
            	job = new obj(context);
                jobs.push(job);

            	// exportObj.__defineGetter__(`create${match[1]}`, () => {
            	exportObj[`create${match[1]}`] = () => {
                    return job;
                };

				queue.process(job.type, _config.get('kue.Concurrency'), (item, callback) => {
					//挂载job执行器
					_co(function *() {
						return yield job.excute({job: item});
					}).then(res => {
						callback(null);
					}).catch(error => {
						callback(error);
					});
				});
            } catch(error){
                console.error("init kue job error:", error);
            }
        }
    });


    // let j = schedule.scheduleJob('* /1 0-23 * *', () => {
        _logger.debug("start cron job");
        if(IS_PROCESSING === true) {
            _logger.debug(`IS_PROCESSING: ${IS_PROCESSING},  exit...`);
            return;
        }

        IS_PROCESSING = true;

        _co(function *() {
            for(let i = 0; i < jobs.length; i ++) {
                let job = jobs[i];
                _logger.debug(`start job: ${job.type} `);
                yield job.createMsg();
                _logger.debug(`job over: ${job.type} `);
            }
            return;
        }).then(res => {
            IS_PROCESSING = false;
            _logger.debug(`all jobs is over, set IS_PROCESSING to false`);
            return;
        }).catch(error => {
            _logger.error("start job error:", error);
        });
    // });
};

module.exports = _.extend(exportObj, {index: job});