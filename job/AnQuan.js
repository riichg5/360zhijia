// 360安全播报   http://bobao.360.cn/
let Base = require('./Base');
let IsProcessing = false;

class Job extends Base {
	constructor(context) {
		super(context);
		this.type = CONST.JOB._360安全客;
		this.priority = CONST.PRIORITY.NORMAL;
	}

	createMsg () {
		let self = this;
		let context = self.context;
		let priority = self.priority;
		let superCreateMsg = super.createMsg.bind(self);

		self.schedule.scheduleJob('*/5 * * * *', () => {
		// self.schedule.scheduleJob('*/10 * * * * *', () => {
			if(IsProcessing === true) {
				self.logger.debug(`job ${self.type} is running, can not run again.`);
				return;
			}

			self.logger.info(`start proccess ${self.type}`);
			IsProcessing = true;

			let startTime = new Date().getTime();
			return _co(function *() {
				let bAnQuan = self.BLL.createAnQuan(context);
				let uris = yield bAnQuan.getArticleList();

				self.logger.debug("end of getArticleList");
				for(let uri of uris) {
					self.logger.debug("uri: ", uri);
					yield superCreateMsg({
						priority: priority,
						data: {
							title: self.type,
							uri: uri
						}
					});
				}
				return;
			}).then(res => {
				let endTime = new Date().getTime();
				self.logger.info("AnQuan Job over. used time:", Math.round((endTime - startTime) / 1000));
				IsProcessing = false;
			}).catch(error => {
				IsProcessing = false;
				self.logger.error("AnQuan Job failed.");
				self.logger.error("error:", error.message);
				self.logger.error("stack:", error.stack);
			});
		});
	}

	excute (opts) {
		let self = this;
		let context = self.context;
		let job = opts.job;

		return _co(function *() {
			self.logger.debug("start excute job, data is: ", job.data.uri);
			let uri = job.data.uri;
			let bAnQuan = self.BLL.createAnQuan(context);

			yield context.sequelize.transaction(() => {
				return bAnQuan.procArticle({uri: uri});
			});
			return;
		});
	}
}

module.exports = Job;