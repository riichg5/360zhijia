let fs = require('fs');
let path = require('path');
let Sequelize = require('sequelize');
let cls = require('continuation-local-storage');
let namespace = cls.createNamespace('my-very-own-namespace');
let Promise = require('bluebird');
let clsBluebird = require('cls-bluebird');
clsBluebird(namespace);

/**
 * Cache of global instances of Sequelize and their models
 */
 global._DB_ORM_Cache = {};
// var cache = {};


/**
 * Add the global instance of Sequelize to the context, also exposed all
 * loaded models to context.models
 *
 * @method sequelize
 */
function sequelize(request, response, next) {
    var context = request.context;

    Object.keys(_DB_ORM_Cache).forEach(function(type) {
        console.info(`---------------> type: ${type}`);
        if (type === 'default') {
            context.sequelize = _DB_ORM_Cache[type].instance;
            context.models = _DB_ORM_Cache[type].models;
        } else {
            context[type + 'Sequelize'] = _DB_ORM_Cache[type].instance;
            context[type + 'Models'] = _DB_ORM_Cache[type].models;
        }
    });

    // Temp patch for read replication problem. FIXME later.
    context.readSequelize = context.sequelize;
    context.readModels = context.models;

    next(null);
}

function convertType() {
    let integerParser = function(val) {
        return parseInt(val, 10);
    };
}

/**
 * Create  global Sequelize instances and import all predefined models.
 *
 * @method sequelizer
 * @param modelsDirectory {String} Canonical path to modules directory
 * @param config {Object} server configuration object.
 * @return {Function} an express middleware function
 */
function sequelizer(modelsDirectory, context) {
    let model = modelsDirectory;

    if (Object.keys(_DB_ORM_Cache).length === 0) {
        let dbConfig = _config.get('db');
        let options;
        let associationsDirectory;

        options = _.clone(dbConfig.sequelize);
        options.protocol = dbConfig.protocol;
        options.host = dbConfig.host;
        options.port = dbConfig.port;
        options.isolationLevel = CONST.SEQUELIZE.READ_COMMITTED;

        console.info('Creating Sequelize instance with options: %j.', options);
        _DB_ORM_Cache.instance = new Sequelize(
            dbConfig.name,
            dbConfig.username,
            dbConfig.password,
            options
        );

        console.info(
            'Loading all Sequelize models from: %s',
            modelsDirectory
        );

        _DB_ORM_Cache.models = [];
        fs.readdirSync(model).forEach(function(filename) {
            /*jslint regexp: true */
            var match = /(\w+)\.js$/.exec(filename);

            if (match) {
                if (!_utils.inTestMode) {
                    console.info('Importing model: %s from: %s.', match[1], filename);
                }

                _DB_ORM_Cache.models[match[1]] = _DB_ORM_Cache.instance['import'](
                    path.join(model, filename)
                );
            }
        });

        associationsDirectory = path.join(model, 'associations');
        if (fs.existsSync(associationsDirectory)) {
            fs.readdirSync(associationsDirectory).forEach(function(filename) {
                /*jslint regexp: true */
                var match = /(\w+)\.js$/.exec(filename);
                var func;

                if (match) {
                    if (!_utils.inTestMode) {
                        console.info('Importing association: %s from: %s.', match[1], filename);
                    }
                    func = require(path.join(associationsDirectory, filename));
                    func(_DB_ORM_Cache.instance, _DB_ORM_Cache.models);
                }
            });
        }
    }

    context.sequelize = _DB_ORM_Cache.instance;
    context.models = _DB_ORM_Cache.models;

    // Temp patch for read replication problem. FIXME later.
    context.readSequelize = context.sequelize;
    context.readModels = context.models;
    // convertType();
    return sequelize;
}

module.exports = sequelizer;
