var Base = require('./Base');

class Wp360TermRelationship extends Base {
    constructor(context) {
        super(context);
        this.model = context.models.Wp360TermRelationship;
    }
}

module.exports = Wp360TermRelationship;