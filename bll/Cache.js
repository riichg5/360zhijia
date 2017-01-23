let redis = require("redis");
let Promise = require('bluebird');
let moment = require('moment');

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

let redisConfig = _config.get("redis");
let client = redis.createClient(redisConfig.port, redisConfig.host, redisConfig.options);

class Cache {
	static set(opts) {
		let key = opts.key;
		let value = opts.value || moment().format('YYYY-MM-DD HH:mm:ss');
		let ttl = opts.ttl;

	    _logger.trace("Storing to redis for key '%s'.", key);

	    return _co(function *() {
	    	let result = yield client.setAsync(key, value);

		    if (ttl > 0) {
		        client.expire(key, ttl);
		    }
		    return;
	    });
	}

	static get(opts) {
		let self = this;
		let key = opts.key;

		_logger.debug("cache key is:", key);
		return client.getAsync(key);
	}
}

module.exports = Cache;