var Base = require('./Base');

class DxCategory extends Base {
    constructor(context) {
        super(context);
        this.model = context.models.DxCategory;
    }
}

module.exports = DxCategory;