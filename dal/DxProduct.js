var Base = require('./Base');

class DxProduct extends Base {
    constructor(context) {
        super(context);
        this.model = context.models.DxProduct;
    }
}

module.exports = DxProduct;