let context = require('../../index').context;
let BLL = require('../../bll');
let bAnQuan;

describe("test", () => {

    before(function(done){
    	bAnQuan = BLL.createAnQuan(context);
    	done();
    });

    // describe('test', () => {
    //     it('test', function (done) {
    //     	bAnQuan.getArticleList().then(urls => {
    //     		_logger.debug("urls:", urls);
    //     		done();
    //     	}).catch(error => {
    //     		_logger.debug("faild:", error);
    //     		done(error);
    //     	});
    //     });
    // });

    describe('get content info', () => {
        it('test', function (done) {
            bAnQuan.getArticleInfo({uri: "http://bobao.360.cn/news/detail/3920.html"}).then(info => {
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