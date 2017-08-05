//360论坛
let Base = require('./Base');
// let IsProcessing = false;
let configs = require(_base + 'config/aidubaUris.json');

class AiDuBa extends Base {
	constructor (context) {
		super(context);
		this.type = CONST.JOB._aiduba;	//类型
		// this.needReply = true;  				//是否需要抓取回复内容
		// this.priority = CONST.PRIORITY.NORMAL;
	}

	createMsg () {
		let self = this;
		let superCreateMsg = super.createMsg.bind(self);
		let context = self.context;

		// return _resolve();
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
					let bAiDuBa = self.BLL.createAiDuBa({context: context, config: item});
					yield bAiDuBa.begin({
						createMsgFunc: function* (opts) {
							yield superCreateMsg({
								priority: opts.priority,
								data: {
									name: item.name,
									title: `${self.type}:${opts.name}`,
									uri: opts.uri,
									needReply: opts.needReply
								}
							});
							return;
						}
					});
					return;
				}).then(res => {
					let endTime = new Date().getTime();
					self.logger.info(`job type: ${self.type}:${item.name} is over. used time:`, Math.round((endTime - startTime) / 1000));
					item.IsProcessing = false;
				}).catch(error => {
					item.IsProcessing = false;
					self.logger.error(`job type: ${self.type}:${item.name} failed.`);
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
			let data = job.data;
			let uri = data.uri;
			let needReply = data.needReply;
			let name = data.name;
			let config = _.find(configs, item => {
				return item.name === name;
			});

			if(!config) {
				return _reject(`can't find config by name: ${name}`);
			}

			let bAiDuBa = self.BLL.createAiDuBa({
				context: context, config: config
			});

			self.logger.debug("start excute job, data is: ", uri);

			yield context.sequelize.transaction(() => {
				return bAiDuBa.procArticle({uri: uri, needReply: needReply});
			});
			return;
		});
	}
}

module.exports = AiDuBa;