/**
 * 东问西问 tasks表
 */

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('tasks', {
    	uri: DataTypes.STRING,
        desc: DataTypes.STRING,
        is_over: DataTypes.INTEGER,
        page_num: DataTypes.INTEGER
    });
};