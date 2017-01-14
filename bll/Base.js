let DAL = require('../dal');
let BLL = require('./index');

class Base {
	constructor(context) {
		this.context = context;
		this.logger = context ? context.logger : {};
		this.DAL = DAL;
		this.BLL = BLL;
	}

	getById(id) {
		return this.dal.getById(id);
	}

	queryOneById(id) {
		return this.dal.queryOneById(id);
	}

	beginTran (func) {
		return this.context.sequelize.transaction(() => {
			return func();
		});
	}
}

module.exports = Base;