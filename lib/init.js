global._base = __dirname + '/../';
global.Promise = require('bluebird');

// Constants
global._ = require('lodash');
require(_base + 'const');

global._config = require('./initConfig');
let configGet = _config.get.bind(_config);
_config.get = function (nodeName) {
	if(_config.has(nodeName)) {
		return configGet(nodeName);
	}
	return undefined;
};
global._logger = require('./initLogger');
global._utils = require(_base + 'lib/utils');
global._util = require('util');

// promise helper
global._reject = (...params)=> {
    let error = params[0];
    if (_.isError(error)) {
        return Promise.reject(error);
    }
   	if(_.isPlainObject(error)) {
   		return Promise.reject(_utils.createErrorWithData.apply(_utils, params));
   	}
    return Promise.reject(_utils.createError.apply(_utils, params));
}

global._resolve = Promise.resolve.bind(Promise);

global._co = require('co');
