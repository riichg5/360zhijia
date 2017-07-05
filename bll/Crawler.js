let Base = require('./Base');
let cheerio = require('cheerio');
let request = require('request-promise');
let Promise = require('bluebird');

class Crawler extends Base {
	constructor(context) {
		super(context);
		this.dal = this.DAL.createCrawler(context);
	}

	isDiscuzUri (uri) {
		if(uri.indexOf('thread-') !== -1 && uri.split('-').length === 4) {
			return true;
		} else {
			return false;
		}
	}

	getDiscuzLikeUri (uri) {
		let splits = uri.split('-');
		return `${splits[0]}-${splits[1]}`;
	}

	isProcessed (uri) {
		let self = this;
		let context = self.context;

	    return _co(function* () {
	    	let redisKey = `super360_${uri}`;
		    let valOfKey = yield self.BLL.Cache.get({key: redisKey});

		    if(valOfKey) {
		    	self.logger.debug(`the key is in redis: ${redisKey}`);
		    	return true;
		    }

		    //如果是discuz论坛，则url需要用模糊匹配
		    let record = null;
		    if(self.isDiscuzUri(uri)) {
		    	let likeUri = self.getDiscuzLikeUri(uri);
		    	record = yield self.dal.findOne({
		    		where: {
		    			url: {
		    				$like: `%${likeUri}%`
		    			}
		    		}
		    	});
		    } else {
				record = yield self.dal.findOne({
					where: {
						url: uri
					}
				});
		    }

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