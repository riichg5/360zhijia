let schedule = require('node-schedule');
let IS_PROCESSING = false;
let Job = require(_base + "job");


let excute = (opts) => {
	let context = opts.context;


	let j = schedule.scheduleJob('* * 0-23 * *', () => {
		IS_PROCESSING = true;

		_co(function *() {
			for(let key in Job) {
				if(key.indexOf('create') === 0) {

					let obj = Job[key](context);
					yield obj.;
				}
			}
		});
	});

};


module.exports = excute;