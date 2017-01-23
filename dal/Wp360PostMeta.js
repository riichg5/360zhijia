var Base = require('./Base');

class Wp360PostMeta extends Base {
    constructor(context) {
        super(context);
        this.model = context.models.Wp360PostMeta;
    }
}

module.exports = Wp360PostMeta;