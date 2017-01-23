// 360安全播报   http://bobao.360.cn/
let Base = require('./Base');

class Job extends Base {
	constructor (context) {
		super(context);
		this.superObj = new Base(context);
		this.superObj.type = this.type = CONST.JOB._360安全客;
	}

	createMsg () {
		let self = this;
		let context = self.context;
		let priority = CONST.PRIORITY.NORMAL;
		// let base = super;

		return _co(function *() {
			let bAnQuan = self.BLL.createAnQuan(context);
			let uris = yield bAnQuan.getArticleList();

			self.logger.debug("end of getArticleList");
			for(let uri of uris) {
				self.logger.debug("uri: ", uri);
				yield self.superObj.createMsg({
					priority: priority,
					data: uri
				});
			}

			return;
		});
	}

	excute (opts) {
		let self = this;
		let context = self.context;
		let job = opts.job;

		return _co(function *() {
			self.logger.debug("start excute job, uri is: ", job.data);
			let uri = job.data;
			let bAnQuan = self.BLL.createAnQuan(context);

			yield bAnQuan.procArticle({uri: uri});
			return;
		}).catch(error => {
			if(error) {
				self.logger.debug("job excute error:", error);
				return error;
			}

			return;
		});
	}
}

module.exports = Job;