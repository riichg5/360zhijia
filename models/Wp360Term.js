/**
 * wp_360_terms table definition
 */

module.exports = function (sequelize, DataTypes) {
    const model = sequelize.define('wp_360_term', {
		name: DataTypes.STRING,
		slug: DataTypes.STRING,
		term_group: DataTypes.INTEGER,
		term_id: {
		    type: DataTypes.INTEGER,
		    primaryKey: true,
		    autoIncrement: true
		}
    },{
    	tableName: 'wp_360_terms',
    	timestamps: false
    });

    return model;
};
