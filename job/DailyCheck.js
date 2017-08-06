//每天清理系统里面的垃圾数据，图片等内容

let Base = require('./Base');
let item = {
	name: '每日检查'
};
// let IsProcessing = false;

class BBS extends Base {
	constructor (context) {
		super(context);
		this.type = CONST.JOB._dailyCheck;	//类型
	}

	createMsg () {
		let self = this;
		let superCreateMsg = super.createMsg.bind(self);
		let context = self.context;

		item.IsProcessing = false;
		// self.schedule.scheduleJob("30 4 * * *", () => {
			if(item.IsProcessing === true) {
				self.logger.debug(`job type: ${self.type}:${item.name} is running, can not run again.`);
				return;
			}

			self.logger.info(`start proccess ${self.type}:${item.name}`);
			item.IsProcessing = true;

			let startTime = new Date().getTime();

			return _co(function* () {
				let bDailyCheck = self.BLL.createDailyCheck({context: context});
				yield bDailyCheck.begin({
					createMsgFunc: function* (opts) {
						yield superCreateMsg({
							priority: opts.priority,
							data: {
								name: item.name,
								title: `${self.type}:${opts.name}`,
							},
							ttl: opts.ttl
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
		// });
	}

	excute (opts) {
		let self = this;
		let context = self.context;
		let job = opts.job;

		return _co(function* () {
			let data = job.data;
			let name = data.name;


			let bDailyCheck = self.BLL.createDailyCheck({
				context: context
			});

			self.logger.debug(`==============> start excute job, ${name}`);

			yield context.sequelize.transaction(() => {
				return bDailyCheck.process();
			});
			return;
		});
	}
}

module.exports = BBS;