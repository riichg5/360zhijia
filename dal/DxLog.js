var Base = require('./Base');

class DxLog extends Base {
    constructor(context) {
        super(context);
        this.model = context.models.DxLog;
    }
}

module.exports = DxLog;