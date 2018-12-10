
global.CONST = _utils.deepFreeze(_.extend(
    require('./common'),
    require('./sequelize')
));