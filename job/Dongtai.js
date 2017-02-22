//360动态
let BBS = require('./BBS');

class Job extends BBS {
	constructor (context) {
		super(context);
		this.type = CONST.JOB._360动态;
	}

	createMsg () {
		// return super.createMsg();
		return _resolve();
	}

	excute (opts) {
		let self = this;
		let context = self.context;
		let job = opts.job;

		return _co(function *() {
			self.logger.debug("start excute job data: ", job.data);
			return;
		});
	}
}

module.exports = Job;