/**
 * 东问西问 asks表
 */

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('ask', {
    	title: DataTypes.STRING,
        content: DataTypes.STRING,
        question_id: {
        	type: DataTypes.INTEGER,
        	get: function()  {
			    return parseInt(this.getDataValue('question_id'), 10);
			}
        },
        product_id: DataTypes.INTEGER,
        reply_count: DataTypes.INTEGER,
    });
};