let Base = require('./Base');
let cheerio = require('cheerio');
let request = require('request-promise');
let Promise = require('bluebird');

class AnQuan extends Base {
	constructor(context) {
		super(context);
        this.uri = "http://bobao.360.cn/";
	}

    getArticleList () {

    }
}

module.exports = AnQuan;