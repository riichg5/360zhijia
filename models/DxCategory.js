/**
 * 东问西问 category表
 */

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('category', {
    	name: DataTypes.STRING
    });
};