var Base = require('./Base');

class Article extends Base {
    constructor(context) {
        super(context);
        this.model = context.models.Wp360Post;
    }
}

module.exports = Article;