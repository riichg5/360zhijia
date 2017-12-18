var Base = require('./Base');

class DxAsk extends Base {
    constructor(context) {
        super(context);
        this.model = context.models.DxAsk;
    }
}

module.exports = DxAsk;