var bunyan = require('bunyan');

console.info('start init logger ...');
// Create worker process root logger
let logger = bunyan.createLogger({
    name: _config.get('appName'),
    level: _config.get('log.level') || 'debug',
    pid: process.pid,
    src: _.eq(process.env.NODE_ENV, 'production') ? false : true
        // worker : cluster && cluster.worker && cluster.worker.id || ''
});

// Redirect console logging methods to logger
console.error = logger.error.bind(logger);
console.warn = logger.warn.bind(logger);
console.info = logger.info.bind(logger);
console.log = logger.debug.bind(logger);
console.trace = logger.trace.bind(logger);

console.info('finish init logger');

module.exports = logger;