/**
 * wp_360_options table definition
 */

module.exports = function (sequelize, DataTypes) {
    const model = sequelize.define('wp_360_option', {
		option_name: DataTypes.STRING,
		option_value: DataTypes.STRING,
		autoload: DataTypes.STRING,
		option_id: {
		    type: DataTypes.INTEGER,
		    primaryKey: true,
		    autoIncrement: true
		}
    },{
    	tableName: 'wp_360_option',
    	timestamps: false
    });

    return model;
};
