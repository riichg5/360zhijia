var Base = require('./Base');

class Article extends Base {
    constructor(context) {
        super(context);
        this.model = context.models.Wp360Post;
    }

    async getDuplicatePosts (opts) {
    	let self = this, context = this.context;
    	let startDate = opts.startDate;
    	let limit = opts.limit;
    	let sql = `
    		select COUNT(*), post_title
    		FROM wp_360_posts
    		WHERE post_date > :startDate
    		GROUP BY post_title
    		HAVING COUNT(*) > 1
    		LIMIT :limit
    	`;
    	let args = {
    		startDate: startDate,
    		limit: limit
    	};

    	let rows = await self.querySelect({
    		sql: sql,
    		args: args
    	});

    	return rows;
    }
}

module.exports = Article;