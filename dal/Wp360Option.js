var Base = require('./Base');

class Wp360Option extends Base {
    constructor(context) {
        super(context);
        this.model = context.models.Wp360Option;
    }
}

module.exports = Wp360Option;