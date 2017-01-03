let Sequelize = require('sequelize');

module.exports = {
	SEQUELIZE: {
		READ_UNCOMMITTED: Sequelize.Transaction.ISOLATION_LEVELS.READ_UNCOMMITTED, // "READ UNCOMMITTED"
		READ_COMMITTED: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED, // "READ COMMITTED"
		REPEATABLE_READ: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,  // "REPEATABLE READ"
		SERIALIZABLE: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE, // "SERIALIZABLE"
		QUERY_TYPE: {
			SELECT: Sequelize.QueryTypes.SELECT,
			DELETE: Sequelize.QueryTypes.DELETE,
			UPDATE: Sequelize.QueryTypes.UPDATE,
			INSERT: Sequelize.QueryTypes.INSERT,
		}
	}
};