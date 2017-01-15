// 360安全播报   http://bobao.360.cn/
let Base = require('./Base');
let BLL = require(_base + 'bll');

class Job extends Base {
	constructor (context) {
		super(context);
		this.type = CONST.JOB._360安全客;
	}

	createMsg () {
		let self = this;
		let context = self.context;
		let priority = CONST.PRIORITY.NORMAL;

		return _co(function *(argument) {
			let bAnQuan = BLL.createAnQuan(context);

			return yield Base.createMsg({
				priority: priority,
				data: ""
			});

		});
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