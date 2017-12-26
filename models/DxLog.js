/**
 * 东问西问 logs表
 */

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('log', {
    	product_id: DataTypes.INTEGER,
        question_ids: DataTypes.STRING
    });
};