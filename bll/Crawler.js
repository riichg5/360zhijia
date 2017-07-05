let Base = require('./Base');
let cheerio = require('cheerio');
let request = require('request-promise');
let Promise = require('bluebird');

class Crawler extends Base {
	constructor(context) {
		super(context);
		this.dal = this.DAL.createCrawler(context);
	}

	isProcessed (uri) {
		let self = this;
		let context = self.context;

	    return _co(function *() {
	    	let redisKey = `super360_${uri}`;
		    let valOfKey = yield self.BLL.Cache.get({key: redisKey});

		    if(valOfKey) {
		    	self.logger.debug(`the key is in redis: ${redisKey}`);
		    	return true;
		    }

			let record = yield self.dal.findOne({
				where: {
					url: uri
				}
			});

			return record ? true : false;
	    });
	}

	addRecord (uri) {
		let self = this;
		let context = self.context;

		return _co(function *() {
			let model = {
				url: uri
			};

			yield self.dal.create(model);
		    yield self.BLL.Cache.set({
		    	key: `super360_${uri}`,
		    	value: 'ready2process',
		    	ttl: _config.get('cacheTTL')
		    });

		    return;
		});
	}
}

module.exports = Crawler;