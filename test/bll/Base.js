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
                imgUrl: "https://timgsa.baidu.com/timg?image&quality=80&size=b9999_10000&sec=1550510854796&di=3c14aee9da797b6a017d1e326e6055aa&imgtype=0&src=http%3A%2F%2Fs8.rr.itc.cn%2Fr%2FwapChange%2F20172_7_16%2Fb967ik8744978714050.gif"
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