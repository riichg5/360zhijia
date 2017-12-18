var Base = require('./Base');

class DxTask extends Base {
    constructor(context) {
        super(context);
        this.model = context.models.DxTask;
    }
}

module.exports = DxTask;