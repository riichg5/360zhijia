/**
 * crawler table definition
 */

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('crawler', {
        url: DataTypes.STRING,
        floor: DataTypes.STRING
    });
};