var Base = require('./Base');

class Wp360Term extends Base {
    constructor(context) {
        super(context);
        this.model = context.models.Wp360Term;
    }

 	//找到url需要的文章分类
  	getCategoryName (categoryId) {
  		let self = this;
  		let sql = `
	        select t.slug from wp_360_terms t, wp_360_term_taxonomy tt
	        where tt.term_id = t.term_id and tt.term_taxonomy_id = :categoryId
	        limit 1
  		`;
  		let args = {
  			categoryId: categoryId
  		};

  		return self.queryOne({
  			sql: sql,
  			args: args
  		}).then(res => {
  			if(!res) {
  				return null;
  			}
  			return res.slug;
  		});
  	}
}

module.exports = Wp360Term;