// 360安全播报   http://bobao.360.cn/
let Base = require('./Base');

class Job extends Base {
	constructor (context) {
		super(context);
		this.type = CONST.JOB._360安全客;
	}

	createMsg (opts) {
		opts.priority = CONST.PRIORITY.NORMAL;
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