let config = require('config');
console.log('config NODE_ENV: ' + config.util.getEnv('NODE_ENV'));
module.exports = config;