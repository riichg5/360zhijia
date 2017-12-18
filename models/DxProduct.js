/**
 * 东问西问 product表
 */

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('product', {
    	name: DataTypes.STRING,
        img_path: DataTypes.STRING,
        category_id: DataTypes.INTEGER,
    });
};