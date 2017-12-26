let util = require('util');
let moment = require('moment');
let uuid = require('uuid');

let utils = {
    createError: (message, statusCode, errorCode, data) => {
        var error;
        error = new Error(message);
        error.statusCode = statusCode ? statusCode : 400;
        error.errorCode = errorCode ? errorCode : '';
        error.data = data || null;
        return error;
    },

    createErrorWithData: (options) => {
        var error;
        error = new Error(options.message || options.msg);
        error.statusCode = options.statusCode ? options.statusCode : 400;
        error.errorCode = options.errorCode ? options.errorCode : '';
        error.data = options.data ? options.data : null;
        return error;
    },

    uuid: () => {
        return uuid();
    },

    coEach: (opts) => {
        let mapArr, start, totalLength;
        let results = [];
        let MAX_CONCURRENT = 2000;
        let collection = opts.collection;
        let handler = opts.func;
        let limit = opts.limit;

        if(!Array.isArray(collection)) {
            throw new Error('argument "collection" should be Array');
        }
        if(typeof handler !== 'function') {
            throw new Error('argument "func" should be function');
        }
        //not a number or negative
        if (!Number.isSafeInteger(limit) || limit < 0) {
            limit = 0;
        }
        //set max concurrent
        if(limit > MAX_CONCURRENT) {
            limit = MAX_CONCURRENT;
        }
        //set max concurrent if collection's length is very large and limit is not set
        totalLength = collection.length;
        if(totalLength && limit === 0) {
            limit = MAX_CONCURRENT;
        }

        return _co(function *() {
            let res;
            for(start=0; start<totalLength; ) {
                mapArr = collection.slice(start, start+limit);
                start += limit;

                res = yield mapArr.map(elem => {
                    return _co(handler(elem));
                });
                results = results.concat(res);
            }

            return results;
        });
    },

    inspect: (opts) => {
        let obj = opts.obj;
        let depth = opts.depth || 3;

        return util.inspect(obj, {depth: depth});
    }
};

module.exports = utils;
