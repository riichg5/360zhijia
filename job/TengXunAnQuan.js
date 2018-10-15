// 腾讯安全应急响应中心   https://security.tencent.com

let Base = require('./Base');
let IsProcessing = false;

class Job extends Base {
	constructor(context) {
		super(context);
		this.type = CONST.JOB._腾讯安全应急响应中心;
		this.priority = CONST.PRIORITY.NORMAL;
	}

	createMsg () {
		let self = this;
		let context = self.context;
		let priority = self.priority;
		let superCreateMsg = super.createMsg.bind(self);

		// self.schedule.scheduleJob('*/12 * * * *', () => {
		self.schedule.scheduleJob('*/10 * * * * *', () => {
			if(IsProcessing === true) {
				self.logger.debug(`job ${self.type} is running, can not run again.`);
				return;
			}

			self.logger.info(`start proccess ${self.type}`);
			IsProcessing = true;

			let startTime = new Date().getTime();
			return _co(function *() {
				let bTengXunAnQuan = self.BLL.createTengXunAnQuan(context);
				let uris = yield bTengXunAnQuan.getArticleList();

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
				self.logger.info("腾讯安全应急响应中心 Job over. used time:", Math.round((endTime - startTime) / 1000));
				IsProcessing = false;
			}).catch(error => {
				IsProcessing = false;
				self.logger.error("腾讯安全应急响应中心 Job failed.");
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
			let bTengXunAnQuan = self.BLL.createTengXunAnQuan(context);

			yield context.sequelize.transaction(() => {
				return bTengXunAnQuan.procArticle({uri: uri});
			});
			return;
		});
	}
}

module.exports = Job;