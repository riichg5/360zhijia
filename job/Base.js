let Promise = require('bluebird');
let schedule = require('node-schedule');
let BLL = require(_base + "bll");
let DAL = require(_base + 'dal');

class Base {
	constructor (context) {
		this.context = context;
		this.logger = context.logger;
		this.BLL = BLL;
		this.DAL = DAL;
		this.schedule = schedule;
		this.type = '';
		this.priority = "normal";
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
	    let data = opts.data;   //这里一般传的是uri
	    let title = data.title;
	    let uri = data.uri;
	    let priority = opts.priority || CONST.PRIORITY.NORMAL;
	    let ttl = opts.ttl || 5 * 60 * 1000;		//默认5分钟超时

	    return _co(function* () {
	    	self.logger.debug("start create message of job:", self.type, ' uri is:', uri);
		    //查询是否已经处理过了
		    let bCrawler = self.BLL.createCrawler(context);
		    let isProcessed = yield bCrawler.isProcessed(uri);

		    if(isProcessed === true) {
		    	self.logger.debug(`already processed: ${uri}`);
		    	return;
		    }

		    let job = self.createJob({type: self.type, data: data});

		    job.removeOnComplete(true)
           	.priority(self.priority)
           	.attempts(20)
           	.backoff(function(attempts, delay){
           		return attempts * 1000 * 60 * 15;  //add 15 minutes
            })
           	.ttl(ttl);

		    let saveJob = Promise.promisify(job.save).bind(job);
		    yield saveJob();
		    yield bCrawler.addRecord(uri);

		    self.logger.debug("job created, job id: %d, job data: %j", job.id, job.data);
		    return;
	    });
	}

	createJDMsg (opts) {
	    let self = this;
	    let context = self.context;
	    let data = opts.data;   //这里一般传的是uri
	    let title = data.title;
	    let uri = data.uri;
	    let priority = opts.priority || CONST.PRIORITY.NORMAL;
	    let ttl = opts.ttl || 5 * 60 * 1000;		//默认5分钟超时

	    return _co(function* () {
	    	self.logger.debug("start create message of job:", self.type, ' uri is:', uri);
		    //查询是否已经处理过了
		    let bCrawler = self.BLL.createCrawler(context);
		    let isProcessed = yield bCrawler.isProcessed(uri);

		    if(isProcessed === true) {
		    	self.logger.debug(`already processed: ${uri}`);
		    	return;
		    }

		    let job = self.createJob({type: self.type, data: data});

		    job.removeOnComplete(true)
           	.priority(self.priority)
           	.attempts(20)
           	.backoff(function(attempts, delay){
           		return attempts * 1000 * 60 * 15;  //add 15 minutes
            })
           	.ttl(ttl);

		    let saveJob = Promise.promisify(job.save).bind(job);
		    yield saveJob();

		    self.logger.debug("job created, job id: %d, job data: %j", job.id, job.data);
		    return;
	    });
	}
}

module.exports = Base;