var fs = require('fs');
var path = require('path');
var assert = require('assert');
var DirectoryNames = [];

function createDal(name, context) {
    assert(name && name.length > 0, 'name must be a non-empty string.');
    assert(typeof context === 'object', 'context must be a valid object.');

    if (exports[name]) {
        var dal = null;
        dal = new exports[name](context);
        return dal;
    }

    console.dir(exports);
    throw new Error('Cannot find given dal class name: ' + name);
}

function loadDirectory(exports, directory) {
    fs.readdirSync(directory).forEach(function (filename) {
        var fullPath;
        var stat;
        var match;

        // Skip itself
        if (filename === 'index.js' || /^\./.test(filename)) {
            return;
        }

        fullPath = path.join(directory, filename);
        stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            DirectoryNames.push(filename);
            return;
        } else {
            match = /(\w+)\.js$/.exec(filename);

            if (match) {
                exports.__defineGetter__(match[1], function () {
                    return require(fullPath);
                });

                //auto export createDao method
                exports['create' + match[1]] = function (context) {
                    return createDal(match[1], context);
                };
            }
        }
    });

    return exports;
}

loadDirectory(exports, __dirname);
exports.createDal = createDal;