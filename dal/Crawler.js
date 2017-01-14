var Base = require('./Base');

class Crawler extends Base {
    constructor(context) {
        super(context);
        this.model = context.models.Crawler;
    }
}

module.exports = Crawler;