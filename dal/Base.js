let DAL = require('./index');

class BaseDal {
    constructor(context) {
        this.context = context;
        this.logger = context ? context.logger : {};
        this.sequelize = context.sequelize;
        this.model = null;
        this.DAL = DAL;
    }

    update(options) {
        var model = options.model;
        var where = options.where;
        return this.model.update(model, {where: where});
    }

    query(...params) {
        return this.sequelize.query.apply(this.sequelize, params);
    }

    /**
    * update sql query
    * @return effect row count
    */
    queryUpdate(opts) {
        let sql = opts.sql;
        let args = opts.args || {};
        let queryOpts = {
            replacements: args,
            type: CONST.SEQUELIZE.QUERY_TYPE.UPDATE
        };
        return this.query(sql, queryOpts).then(res => {
            this.logger.debug("queryUpdate res: %j", res);
            // return res[1].rowCount;
            return;
        });
    }

    queryInsert(opts) {
        let sql = opts.sql;
        let args = opts.args;
        let queryOpts = {
            replacements: args,
            type: CONST.SEQUELIZE.QUERY_TYPE.INSERT
        };
        return this.query(sql, queryOpts).then(res => {
            // return res[1].rowCount;
            this.logger.debug("queryInsert res: %j", res);
            return;
        });
    }

    queryDelete(opts) {
        let sql = opts.sql;
        let args = opts.args;
        let queryOpts = {
            replacements: args,
            type: CONST.SEQUELIZE.QUERY_TYPE.DELETE
        };
        return this.query(sql, queryOpts).then(res => {
            // return res[1].rowCount;
            this.logger.debug("queryDelete res: %j", res);
            return;
        });
    }

     /**
      * query multi result
      * @param  {object} opts:
      *         sql: required
	  * 		args:
      * 		cache: {
      * 	        key:
      * 	        ttl:
      	*   	}
      * @return []
      */
    querySelect(opts) {
        let sql = opts.sql;
        let args = opts.args || {};
        let cache = opts.cache; //TODO:
        let context = this.context;
        let queryOpts = {
            replacements: args,
            type: CONST.SEQUELIZE.QUERY_TYPE.SELECT
        };

        // if(cache && cache.key && cache.ttl) {
        //     return redisHelper.pGet(context, cache.key).then(res => {
        //         if(res) {
        //             return _resolve(res);
        //         }

        //         return this.query(sql, queryOpts).then(res => {
        //             //asynchronous set redis
        //             if(res && res.length) {
        //                 redisHelper.pSet(context, cache.key, res, cache.ttl);
        //             }
        //             return _resolve(res);
        //         });
        //     })
        // } else {
            return this.query(sql, queryOpts);
        // }
    }

     /**
      * query single result
      * @param  {object} opts:
      *         sql: required
	  * 		args:
      * 		cache:
      * @return {}
      */
    queryOne(opts) {
        return this.querySelect(opts).then(res => {
            if (_.isEmpty(res)) {
                return null;
            }
            return res[0];
        });
    }

    queryOneById(...params) {
        return this.model.findById.apply(this.model, params).then(res => {
            if(!res) {
                return _resolve(null);
            }
            return _resolve(res);
        });
    }

    getById(...params) {
        return this.model.findById.apply(this.model, params).then(res => {
            if(!res) {
                return _reject(`Can not find by id. model:${this.model} id:${params[0]}`);
            }
            return _resolve(res);
        });
    }

    findOne(...params) {
        return this.model.findOne.apply(this.model, params);
    }

    findOrCreate(...params) {
        return this.model.findOrCreate.apply(this.model, params);
    }

    create(...params) {
        return this.model.create.apply(this.model, params);
    }

    bulkCreate(...params) {
        return this.model.bulkCreate.apply(this.model, params);
    }

    destroy(...params) {
        return this.model.destroy.apply(this.model, params);
    }

    findAndCountAll(...params) {
        return this.model.findAndCountAll.apply(this.model, params);
    }

    findAll(...params) {
        return this.model.findAll.apply(this.model, params);
    }

    count(...params) {
        return this.model.count.apply(this.model, params);
    }

    max(...params) {
        return this.model.max.apply(this.model, params);
    }

    min(...params) {
        return this.model.min.apply(this.model, params);
    }

    sum(...params) {
        return this.model.sum.apply(this.model, params);
    }

    upsert(...params) {
        return this.model.upsert.apply(this.model, params);
    }
}

module.exports = BaseDal;
