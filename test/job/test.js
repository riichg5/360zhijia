let context = require('../../index').context;
let job = require('../../job');
let jDongtai;

describe("create job message", () => {

    before(function(done){
    	jDongtai = job.createDongtai(context);
    	done();
    });

    describe('create job message', () => {
        it('create a job message', function (done) {
        	jDongtai.createMsg({data: "hello world."}).then(() => {
        		_logger.debug("success!");
        		done();
        	}).catch(error => {
        		_logger.debug("faild:", error);
        		done(error);
        	});
        });
    });


    after(function(done){

    });
});