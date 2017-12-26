let utils = require('./utils');
let Promise = require('bluebird');

function lock(options, callback) {
    let context = options.context;
    let name = options.name;
    let value = options.value || true;
    let timeout = options.timeout ? options.timeout : 300;
    let logger = context.logger;
    let redisClient = context.redisClient;
    let error;

    if (!name) {
        error = utils.createError('lock name is required.', 400);
        callback(error);
        return;
    }

    if (!redisClient) {
        error = utils.createError("Failed to lock '" + name + "'. Lock service not available.", 400);
        callback(error);
        return;
    }


    logger.trace("Locking '%s'", options.name);
    redisClient.setnx(name, value, function (error, succeeded) {
        if (error) {
            logger.trace("Unable to lock '%s': %s", name, error.message || error);
            callback(error);
            return;
        }

        if (!succeeded) {
            logger.trace("Unable to lock '%s': Already locked by others.", name);
            callback(null, false);
            return;
        }

        logger.trace("'%s' has been locked successfully.", name);
        redisClient.expire(name, timeout, function () {
            callback(null, true);
        });
    });
}

/**
 * Unlock a lock with the specified name.
 * @method unlock
 * @param context {Object}
 * @param name {String} name of the lock.
 */
// exports.unlock = function (context, name, callback) {
function unlock (options, callback) {
    let context = options.context;
    let name = options.name;
    let logger = context.logger;
    let redisClient = context.redisClient;
    let error;

    if (!name) {
        callback();
        return;
    }

    if (!redisClient) {
        error = utils.createError(
            "Failed to unlock '" + name + "'. Lock service not available.",
            400
        );
        callback(error);
        return;
    }

    logger.trace("Unlocking '%s'", name);
    redisClient.del(name, function (error) {
        if (error) {
            logger.trace("Unable to unlock '%s': %s", name, error.message || error);
            callback(error);
            return;
        }

        logger.trace("'%s' has been unlocked successfully.", name);
        callback();
    });
}

function pBulkUnLock (opts) {
    let context = opts.context;
    let keys = opts.keys;
    let logger = context.logger;

    return _co(function* () {
        let pUnlock = Promise.promisify(unlock);

        yield _utils.coEach({
            limit: 20,
            collection: keys,
            func: function* (key) {
                try {
                    yield pUnlock({
                        context: context,
                        name: key
                    });
                    logger.debug(`unlock key ${key} success.`);
                } catch(error) {
                    logger.debug('unlock '+ key +' error');
                }
            }
        });
    });
}



let helper = {
    lock: lock,
    unlock: unlock,
    pLock: Promise.promisify(lock),
    pUnlock: Promise.promisify(unlock),
    pBulkUnLock: pBulkUnLock
};

module.exports = helper;

