/**
 * wp_360_term_relationships table definition
 */

module.exports = function (sequelize, DataTypes) {
    const model = sequelize.define('wp_360_postmeta', {
		post_id: DataTypes.INTEGER,
		meta_key: DataTypes.STRING,
		meta_value: DataTypes.INTEGER,
		meta_id: {
		    type: DataTypes.INTEGER,
		    primaryKey: true,
		    autoIncrement: true
		}
    },{
    	tableName: 'wp_360_postmeta',
    	timestamps: false
    });

    return model;
};

