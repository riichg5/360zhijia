let Base = require('./Base');
let Promise = require('bluebird');
let moment = require('moment');

class DailyCheck extends Base {
	constructor(opts) {
        let context = opts.context;
        let name = opts.name;

        super(context);
		this.name = name;
	}

	begin (opts) {
        let self = this;
        let context = self.context;
        let createMsgFunc = opts.createMsgFunc;

        return _co(function* () {
            yield createMsgFunc({
                priority: CONST.PRIORITY.CRITICAL,
                ttl: 2880 * 60 * 1000		//两天
            });
        });
	}

	async process () {
		let self = this, context = this.context;

		let bArticle = self.BLL.createArticle(context);
		await bArticle.processDuplicateArticles({
			// startDate: moment('2017-04-01 00:00:00').toDate()
			startDate: moment().add(-5, 'days').toDate()
		});
	}
}

module.exports = DailyCheck;