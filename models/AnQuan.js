/**
 * anquans table definition
 */

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('anquan', {
    	start_id: DataTypes.INTEGER,
        current_id: DataTypes.INTEGER,
    });
};