//360动态
let Base = require('./Base');

class Job extends Base {
	constructor (context) {
		super(context);
		this.type = CONST.JOB._360动态;
	}

	createMsg (opts) {
		return super.createMsg(opts);
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