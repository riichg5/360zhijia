var Base = require('./Base');

class AnQuan extends Base {
    constructor(context) {
        super(context);
        this.model = context.models.AnQuan;
    }

    getCurrentId (opts) {
        let self = this, context = self.context;

        return _co(function* () {
            let row = yield self.findOne({
                where: {
                    id: 1
                },
                raw: true
            });

            return row.current_id;
        });
    }

    updateCurrentId (opts) {
        let self = this, context = self.context;
        let currentId = opts.currentId;

        return self.update({
            model: {
                current_id: currentId
            },
            where: {
                id: 1
            }
        });
    }
}

module.exports = AnQuan;