/**
 * 东问西问 asks表
 */

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('ask', {
    	title: DataTypes.STRING,
        content: DataTypes.STRING,
        question_id: DataTypes.INTEGER,
        product_id: DataTypes.INTEGER,
        reply_count: DataTypes.INTEGER,
    });
};