let Base = require('./Base');
let cheerio = require('cheerio');
let request = require('request-promise');
let Promise = require('bluebird');

class AnQuan extends Base {
	constructor(context) {
		super(context);
        // this.uri = "https://api.anquanke.com/data/v1/post?id=";
        this.tagIds = [495];
        this.categoryId = 495;
        this.dal = this.DAL.createAnQuan(context);
	}

    getUri (id) {
        return `https://api.anquanke.com/data/v1/post?id=${id}`;
    }

    getArticleListUri (id) {
        return `https://api.anquanke.com/data/v1/posts?page=1&size=30`;
    }

    //出口方法
    getArticleList () {
        let self = this, context = self.context;

        return _co(function* () {
            let res = yield self.loadJSON({
                uri: self.getArticleListUri(),
                isJsonResponse: true
            });

            let urls = [];
            for(let item of res.data) {
                let uri = self.getUri(item.id);
                urls.push(uri);
            }

            urls = _.uniq(_.compact(urls));
            self.logger.debug(`----> anquan urls: ${urls}`);
            return urls;
        });

        // return _co(function* () {
        //     let currentId = yield self.dal.getCurrentId();
        //     let isExist = false;
        //     let urls = [];

        //     let lastId = currentId;
        //     currentId += 1;
        //     do {
        //         let uri = self.getUri(currentId);
        //         let res = yield self.loadJSON({
        //             uri: uri,
        //             isJsonResponse: true
        //         });

        //         if(res && res.id === currentId) {
        //             isExist = true;
        //             lastId = currentId;
        //             currentId += 1;
        //             urls.push(uri);
        //         } else {
        //             isExist = false;
        //         }
        //     } while(isExist);

        //     yield self.dal.updateCurrentId({currentId: lastId});

        //     urls = _.uniq(_.compact(urls));
        //     self.logger.debug(`----> anquan urls: ${urls}`);
        //     return urls;
        // });
    }

    //excute 方法
    procArticle (opts) {
        let self = this;
        let context = self.context;
        let uri = opts.uri;

        return _co(function* () {
            let bArticle = self.BLL.createArticle(context);
            let articleInfo = yield self.getArticleInfo({uri: uri});

            self.logger.debug("start add article to db.");
            let postArticle = yield bArticle.addOne({
                subject: articleInfo.title,
                content: articleInfo.content,
                excerpt: articleInfo.excerpt,
                uri: articleInfo.uri,
                tagIds: self.tagIds
            });

            yield self.pushUri({postId: postArticle.id});
            return;
        });
    }

    getArticleInfo (opts) {
        let self = this;
        let context = self.context;
        let uri = opts.uri;
        let id = uri.split('id=')[1];
        let info = {
            title: "",
            content: "",
            excerpt: "",
            uri: uri
        };

        return _co(function *(argument) {
            let res = yield self.loadJSON({
                uri: uri,
                isJsonResponse: true
            });

            info.title = res.title;
            self.logger.debug(`============>res.content: ${res.content}`);
            info.$content = cheerio.load(res.content).root();

            yield self.baseHtmlProcess({$content: info.$content, uri: uri});
            let replaceInfo = yield self.procContentImgs({$html: info.$content, uri: uri});
            info.content = self.filterHtml(replaceInfo.html);
            info.content = info.content + `<p>本文来源于360安全客，原文地址：<a href='https://www.anquanke.com/post/id/${id}' target='_blank'>https://www.anquanke.com/post/id/${id}</a></p>`;
            info.excerpt = res.desc; //self.getExcerpt(info.$content.text());

            return info;
        });
    }
}

module.exports = AnQuan;