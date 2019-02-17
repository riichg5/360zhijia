require('./lib/init');
let kue = require('kue');
let path = require('path');
let Redis = require('redis');

let context = {};

//为context添加sequelize orm
require(_base + 'lib/initSequelize')(path.join(_base, './models'), context);

// console.log(`=================> context.models: `, _util.inspect({obj: context.models, depth: 3}));

//KUE配置
kue.app.set('title', _config.get("kue.title"));
kue.app.listen(_config.get('kue.port'));

let queue = kue.createQueue({
    prefix: _config.get("kue.prefix"),
    redis: {
        port: _config.get("redis.port"),
        host: _config.get("redis.host"),
        db: _config.get("redis.db"),
        auth: _config.get("redis.auth"),
        options: {}
    }
});

/*
    下面代码是解决以下问题
    Possible EventEmitter memory leak detected. 11 enqueue listeners added. Use emitter.setMaxListeners() to increase limit
    https://github.com/Automattic/kue/issues/1030
*/
queue.setMaxListeners(1000);

context.queue = queue;
context.logger = _logger;

//初始化redis cache连接
let redisConfig = _config.get("cacheRedis");
_logger.trace('Creating redis client using config: %j', redisConfig);
let redis = Redis.createClient(redisConfig.port, redisConfig.host, redisConfig.options);
redis.on('error', function (details) {
    _logger.error('Got error event from redis: %j', details);
});
context.redisClient = redis;

if (redisConfig.password) {
	_logger.trace('auth redis, password: %s', redisConfig.password);
	redis.auth(redisConfig.password, function (error) {
	    if (error) {
	    	throw(error.message);
	    }
	});
}


// 初始化kue job
require(_base + 'job').index({context: context});

module.exports = {
	context: context
};
