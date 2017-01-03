let util = require('util');
let moment = require('moment');
let uuid = require('uuid');

let utils = {
    createError: (message, statusCode, errorCode, data) => {
        var error;
        error = new Error(message);
        error.statusCode = statusCode ? statusCode : 400;
        error.errorCode = errorCode ? errorCode : '';
        error.data = data || null;
        return error;
    },

    createErrorWithData: (options) => {
        var error;
        error = new Error(options.message || options.msg);
        error.statusCode = options.statusCode ? options.statusCode : 400;
        error.errorCode = options.errorCode ? options.errorCode : '';
        error.data = options.data ? options.data : null;
        return error;
    },

    uuid: () => {
        return uuid();
    }
};
