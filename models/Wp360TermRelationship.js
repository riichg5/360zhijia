/**
 * wp_360_term_relationships table definition
 */

module.exports = function (sequelize, DataTypes) {
    const model = sequelize.define('wp_360_term_relationship', {
		object_id: DataTypes.STRING,
		term_taxonomy_id: DataTypes.STRING,
		term_order: DataTypes.STRING,
    }, {
    	timestamps: false
    });

    model.removeAttribute('id');
    return model;
};

