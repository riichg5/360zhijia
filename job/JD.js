// 京东，东问西问

let Base = require('./Base');
let lockHelper = require(_base + 'lib/lockHelper');
let IsProcessing = false;

class Job extends Base {
	constructor(context) {
		super(context);
		this.type = CONST.JOB._jd;
		this.priority = CONST.PRIORITY.NORMAL;
	}

	createMsg () {
		let self = this;
		let context = self.context;
		let priority = self.priority;
		let superCreateMsg = super.createJDMsg.bind(self);

		if(process.env.NODE_ENV.indexOf('jd') === -1) {
			self.logger.debug(`不执行东问西问任务...`);
			return;
		}
		//每3分钟
		// self.schedule.scheduleJob('*/3 * * * *', () => {
		self.schedule.scheduleJob('*/30 * * * * *', () => {

			let startTime = new Date().getTime();
			let isLockFailed = false;

			return _co(function* () {
				// let isLock = yield lockHelper.pLock({
				// 	context: context,
				// 	name: `lock_job_type_${self.type}`,
				// 	timeout: 3600 * 24 * 365,	//锁一年
				// });

				// if(!isLock){
				// 	isLockFailed = true;
				// 	self.logger.warn(`failed to lock ${self.type}`);
				// 	return;
				// }

				if(IsProcessing === true) {
					self.logger.debug(`job ${self.type} is running, can not run again.`);
					return;
				}

				self.logger.info(`start proccess ${self.type}`);
				IsProcessing = true;

				let bJD = self.BLL.createJD(context);
				yield bJD.begin({
					createMsgFunc: superCreateMsg,
				});

				self.logger.debug("end of jd.");
				return;
			}).then(res => {
				let endTime = new Date().getTime();
				self.logger.info("JD Job over. used time:", Math.round((endTime - startTime) / 1000));
				IsProcessing = false;
				// if(!isLockFailed) {
				// 	return _co(function* () {
				// 		yield lockHelper.pUnlock({
				// 			context: context,
				// 			name: `lock_job_type_${self.type}`
				// 		});
				// 	});
				// }
			}).catch(error => {
				IsProcessing = false;
				self.logger.error("JD Job failed.");
				self.logger.error("error:", error.message);
				self.logger.error("stack:", error.stack);
			});
		});
	}

	excute (opts) {
		let self = this;
		let context = self.context;
		let job = opts.job;

		return _co(function* () {
			self.logger.debug(`start excute job, data is: ${_utils.inspect({obj: job.data})}`);

			let bJD = self.BLL.createJD(context);
			yield bJD.processQuestionsByProductId(job.data.productId);
		});
	}
}

module.exports = Job;