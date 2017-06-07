let request = require('request-promise');
let Base = require('./Base');

class Push extends Base {
    constructor(context) {
        super(context);
    }

    pushToBaidu (opts) {
        let self = this;
        let uri = opts.uri;
        let baiduPush = _config.get("push.baidu");

        return _co(function* () {
            self.logger.debug("push baidu uri is: ", baiduPush);
            self.logger.debug("push uri is: ", uri);
            let parsedBody = yield request({
                method: 'POST',
                uri: baiduPush,
                body: [uri].join('\r\n'),
                headers: {
                    'content-type': 'text/plain'
                },
                timeout: 6000
            });

            self.logger.debug("parsedBody:", parsedBody);
            return parsedBody;
        }).then(() => {
            self.logger.debug(`${uri} push to baidu success.`);
            return;
        }).catch(error => {
            self.logger.debug("${uri} push to baidu failed. error message: ${error.message}");
            self.logger.debug("error stack: ", error.stack);
            return;
        });
    }

    pushMIPToBaidu (opts) {
        let self = this;
        let uri = opts.uri;
        let baiduPush = _config.get("push.mipBaidu");

        return _co(function* () {
            self.logger.debug("push mip baidu uri is: ", baiduPush);
            self.logger.debug("push uri is: ", uri);
            let parsedBody = yield request({
                method: 'POST',
                uri: baiduPush,
                body: [uri].join('\r\n'),
                headers: {
                    'content-type': 'text/plain'
                },
                timeout: 6000
            });

            self.logger.debug("parsedBody:", parsedBody);
            return parsedBody;
        }).then(() => {
            self.logger.debug(`${uri} push to mip baidu success.`);
            return;
        }).catch(error => {
            self.logger.debug("${uri} push to mip baidu failed. error message: ${error.message}");
            self.logger.debug("error stack: ", error.stack);
            return;
        });
    }

    pushToAll (opts) {
        let self = this;
        let uri = opts.uri;

        return _co(function* () {
            if(process.env.NODE_ENV !== 'production') {
                self.logger.debug("not production NODE_ENV, no need push url.");
                return;
            }

            yield [
                self.pushToBaidu({uri: uri})
            ];
        });
    }

    pushToBaiduMip (opts) {
        let self = this;
        let uri = opts.uri;

        return _co(function* () {
            if(process.env.NODE_ENV !== 'production') {
                self.logger.debug("not production NODE_ENV, no need push url.");
                return;
            }

            yield [
                self.pushMIPToBaidu({uri: uri})
            ];
        });
    }
}

module.exports = Push;
