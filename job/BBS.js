//360论坛
let Base = require('./Base');
let IsProcessing = false;
let configs = require(_base + 'config/bbsUris.json');

class BBS extends Base {
	constructor (context) {
		super(context);
		this.type = CONST.JOB._360BBS;	//类型
		// this.needReply = true;  				//是否需要抓取回复内容
		// this.priority = CONST.PRIORITY.NORMAL;
	}

	createMsg () {
		let self = this;
		let superCreateMsg = super.createMsg.bind(self);
		let context = self.context;

		_.each(configs, item => {
			item.IsProcessing = false;
			self.schedule.scheduleJob(item.cron, () => {
				if(item.IsProcessing === true) {
					self.logger.debug(`job type: ${self.type}:${item.name} is running, can not run again.`);
					return;
				}

				self.logger.info(`start proccess ${self.type}:${item.name}`);
				item.IsProcessing = true;

				let startTime = new Date().getTime();

				return _co(function* () {
					let bBBS = self.BLL.createBBS({context: context, config: item});
					let uris = yield bBBS.getArticleList();

					self.logger.debug("end of getArticleList");
					for(let uri of uris) {
						self.logger.debug("uri: ", uri);
						yield superCreateMsg({
							priority: item.priority,
							data: {
								title: `${self.type}:${item.name}`,
								uri: item.uri,
								needReply: item.needReply
							}
						});
					}
					return;
				}).then(res => {
					let endTime = new Date().getTime();
					self.logger.info("job type: ${self.type}:${item.name} is over. used time:", Math.round((endTime - startTime) / 1000));
					IsProcessing = false;
				}).catch(error => {
					IsProcessing = false;
					self.logger.error("job type: ${self.type}:${item.name} failed.");
					self.logger.error("error:", error.message);
					self.logger.error("stack:", error.stack);
				});
			});
		});
	}

	excute (opts) {
		let self = this;
		let context = self.context;
		let job = opts.job;

		return _co(function* () {
			self.logger.debug("start excute job data: ", job.data);
			return;
		});
	}
}

module.exports = BBS;