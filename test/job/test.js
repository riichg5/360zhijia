let context = require('../../index.test').context;
let Dongtai = require('../../job/Dongtai');
let jDongtai;
let schedule = require('node-schedule');

describe("create job message", () => {

    before(function(done){
        jDongtai = new Dongtai(context);
    	done();
    });

    describe('create job message', () => {
        // it('create a job message', function (done) {
        // 	jDongtai.createMsg({data: "hello world."}).then(() => {
        // 		_logger.debug("success!");
        // 		done();
        // 	}).catch(error => {
        // 		_logger.debug("faild:", error);
        // 		done(error);
        // 	});
        // });

        it('node schedule test', function (done) {
            schedule.scheduleJob('*/1 * * * * *', function(){
                console.log("every 1 second.");
            });

            schedule.scheduleJob('*/5 * * * * *', function(){
                console.log("every 5 seconds.");
            });
        });
    });


    after(function(done){

    });
});