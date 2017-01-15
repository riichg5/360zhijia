let context = require('../../index').context;
let BLL = require('../../bll');

describe("test", () => {

    before(function(done){
        _logger.debug("Cache:", BLL.Cache);
        BLL.Cache.set({key: "http://bobao.360.cn/news/detail/3920.html", ttl: 30}).then(info => {
            done();
        }).catch(error => {
            _logger.debug("faild:", error);
            done(error);
        });
    });

    describe('test', () => {
        it('test', function (done) {
            BLL.Cache.get({key: "http://bobao.360.cn/news/detail/3920.html"}).then(info => {
                _logger.debug("info:", info);
                done();
            }).catch(error => {
                _logger.debug("faild:", error);
                done(error);
            });
        });
    });


    after(function(done){
        done();
    });
});