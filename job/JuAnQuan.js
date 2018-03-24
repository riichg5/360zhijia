/*
	阿里聚安全， 安全资讯
	http://jaq.alibaba.com/community/category?spm=a313e.7916648.21000000.2.68f774d3QzMIp2&catid=17
*/
let Base = require('./Base');
let IsProcessing = false;

class Job extends Base {
	constructor(context) {
		super(context);
		this.type = CONST.JOB._阿里聚安全安全资讯;
		this.priority = CONST.PRIORITY.NORMAL;
	}

	createMsg () {
		let self = this;
		let context = self.context;
		let priority = self.priority;
		let superCreateMsg = super.createMsg.bind(self);

		self.schedule.scheduleJob('*/26 * * * *', () => {
		// self.schedule.scheduleJob('*/10 * * * * *', () => {
			if(IsProcessing === true) {
				self.logger.debug(`job ${self.type} is running, can not run again.`);
				return;
			}

			self.logger.info(`start proccess ${self.type}`);
			IsProcessing = true;

			let startTime = new Date().getTime();
			return _co(function *() {
				let bJuAnQuan = self.BLL.createJuAnQuan(context);
				let uris = yield bJuAnQuan.getArticleList();

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
				self.logger.info("JuAnQuan Job over. used time:", Math.round((endTime - startTime) / 1000));
				IsProcessing = false;
			}).catch(error => {
				IsProcessing = false;
				self.logger.error("JuAnQuan Job failed.");
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
			let bJuAnQuan = self.BLL.createJuAnQuan(context);

			yield context.sequelize.transaction(() => {
				return bJuAnQuan.procArticle({uri: uri});
			});
			return;
		});
	}
}

module.exports = Job;