/**
 * wp_360_posts table definition
 */

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('wp_360_post', {
		post_author: DataTypes.INTEGER,
		post_date: DataTypes.DATE,
		post_date_gmt: DataTypes.DATE,
		post_modified: DataTypes.DATE,
		post_modified_gmt: DataTypes.DATE,
		post_content: DataTypes.STRING,
		post_title: DataTypes.STRING,
		post_status: DataTypes.STRING,
		comment_status: DataTypes.STRING,
		ping_status: DataTypes.STRING,
		post_name: DataTypes.STRING,
		post_parent: DataTypes.STRING,
		post_type: DataTypes.STRING,
		post_excerpt: DataTypes.STRING,
		to_ping: DataTypes.STRING,
		pinged: DataTypes.STRING,
		post_content_filtered: DataTypes.STRING,
		id: {
		    type: DataTypes.INTEGER,
		    primaryKey: true,
		    autoIncrement: true
		}
    }, {
    	timestamps: false
    });
};