let context = require('../../index').context;
let BLL = require('../../bll');
let bAnQuan;

describe("test", () => {

    before(function(done){
    	bAnQuan = BLL.createAnQuan(context);
    	done();
    });

    describe('test', () => {
        it('test', function (done) {
        	bAnQuan.getImageFolderName();
            done();
        });
    });


    describe('test download img', () => {
        it('test', function (done) {
            bAnQuan.imgDownload({
                imgUrl: "http://p1.qhimg.com/t016576eb73b422e603.png"
            }).then(imageName => {
                _logger.debug("imageName:", imageName);
                done();
            }).catch(error => {
                _logger.debug("error:", error);
                done();
            });
        });
    });

    after(function(done){
        done();
    });
});