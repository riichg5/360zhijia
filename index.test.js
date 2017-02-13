require('./lib/init');
let kue = require('kue');
let path = require('path');

let context = {};

//为context添加sequelize orm
require(_base + 'lib/initSequelize')(path.join(_base, './models'), context);

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
        options: {
        }
    }
});
context.queue = queue;
context.logger = _logger;

//初始化kue job
// require(_base + 'job').index({context: context});


module.exports = {
	context: context
};