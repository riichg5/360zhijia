let Promise = require('bluebird');

class Base {

	constructor (context) {
		this.context = context;
		this.logger = context.logger;
		this.type = '';
	}

	createJob (opts) {
	    var self = this;
	    var context = self.context;
	    var type = opts.type;
	    var data = opts.data;

	    return context.queue.create(type, data);
	}

	createMsg (opts) {
	    let self = this;
	    let context = self.context;
	    let data = opts.data;
	    let priority = opts.priority || CONST.PRIORITY.NORMAL;

	    return _co(function *() {
		    _logger.debug("start create %s job", self.type);
		    let job = self.createJob({type: self.type, data: data});
	        job.removeOnComplete(true)
	           .priority('normal')
	           .attempts(100)
	           .backoff(function(attempts, delay){
	           		return attempts * 1000 * 60 * 15;  //add 15 minutes
	            })
	           .ttl(15 * 1000);

		    let saveJob = Promise.promisify(job.save).bind(job);
		    yield saveJob();
		    _logger.debug("job created, job id: %d, job data: %j", job.id, job.data);

		    return;
	    });
	}
}

module.exports = Base;