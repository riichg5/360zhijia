// 瑞星动态
let Base = require('./Base');
let IsProcessing = false;

class Job extends Base {
	constructor(context) {
		super(context);
		this.type = CONST.JOB._jinshan;
		this.priority = CONST.PRIORITY.NORMAL;
	}

	createMsg () {
		let self = this;
		let context = self.context;
		let priority = self.priority;
		let superCreateMsg = super.createMsg.bind(self);

		//每小时57分
		self.schedule.scheduleJob('*/13 * * * *', () => {
			if(IsProcessing === true) {
				self.logger.debug(`job ${self.type} is running, can not run again.`);
				return;
			}

			self.logger.info(`start proccess ${self.type}`);
			IsProcessing = true;

			let startTime = new Date().getTime();
			return _co(function* () {
				let bJinShan = self.BLL.createJinShan(context);
				let uris = yield bJinShan.getArticleList();

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
				self.logger.info("JinShan Job over. used time:", Math.round((endTime - startTime) / 1000));
				IsProcessing = false;
			}).catch(error => {
				IsProcessing = false;
				self.logger.error("JinShan Job failed.");
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
			self.logger.debug("start excute job, data is: ", job.data.uri);
			let uri = job.data.uri;
			let bJinshan = self.BLL.createJinShan(context);

			yield context.models.transaction(() => {
				return bJinshan.procArticle({uri: uri});
			});
			return;
		});
	}
}

module.exports = Job;