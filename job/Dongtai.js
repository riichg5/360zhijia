//360动态
//http://www.360.cn/news.html

let Base = require('./Base');
let IsProcessing = false;

class Job extends Base {
	constructor (context) {
		super(context);
		this.type = CONST.JOB._360动态;
		this.priority = CONST.PRIORITY.NORMAL;
	}

	createMsg () {
		let self = this;
		let context = self.context;
		let priority = self.priority;
		let superCreateMsg = super.createMsg.bind(self);

		self.schedule.scheduleJob('*/5 * * * *', () => {
			if(IsProcessing === true) {
				self.logger.debug(`job ${self.type} is running, can not run again.`);
				return;
			}

			self.logger.info(`start proccess ${self.type}`);
			IsProcessing = true;

			let startTime = new Date().getTime();
			return _co(function* () {
				let bDongTai = self.BLL.createDongTai(context);
				let uris = yield bDongTai.getArticleList();
				self.logger.debug("uris: ", uris);

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
				self.logger.info("360动态 Job over. used time:", Math.round((endTime - startTime) / 1000));
				IsProcessing = false;
			}).catch(error => {
				IsProcessing = false;
				self.logger.error("360动态 Job failed.");
				self.logger.error("error:", error.message);
				self.logger.error("stack:", error.stack);
			});
		});
	}

	excute (opts) {
		let self = this;
		let context = self.context;
		let job = opts.job;
		let data = job.data;
		let uri = data.uri;
		let needReply = data.needReply;
		let name = data.name;

		self.logger.debug("start excute job, data is: ", uri);

		return _co(function* () {
			let bDongTai = self.BLL.createDongTai(context);
			yield context.sequelize.transaction(() => {
				return bDongTai.procArticle({uri: uri, needReply: false});
			});
		});
	}
}

module.exports = Job;