//360动态

let Base = require('./Base');
let cheerio = require('cheerio');
let Promise = require('bluebird');
let path = require('path');

class DongTai extends Base {
	constructor(context) {
		super(context);
        this.uri = "http://www.360.cn/news.html";
        this.tagIds = [449];
        this.categoryId = 495;
	}

    //出口方法
    getArticleList () {
        let self = this;
        let context = self.context;

        return _co(function* () {
            let $ = yield self.loadUri({uri: self.uri});
            let aLinks = $(".article-list ul").find('h2 a') ;
            let urls = [];

            let baseNames = [];
            aLinks.each((i, link) => {
                if(link && link.attribs && link.attribs.href) {
                    let baseName = path.parse(link.attribs.href).base;
                    if(baseNames.indexOf(baseName) !== -1) {
                        return;
                    }

                    baseNames.push(baseName);

                    urls.push(link.attribs.href);
                }
            });

            urls = _.uniq(_.compact(urls));
            return urls;
        });
    }

    //excute 方法
    //需要处理两种格式的文章
    //http://weishi.360.cn/news.html?i=news0711m
    //http://www.360.cn/newslist/sjaq/yzrfmylzpdh.html
    procArticle (opts) {
        let self = this;
        let context = self.context;
        let uri = opts.uri;
        let bArticle = self.BLL.createArticle(context);

        return _co(function* () {
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
        });
    }

    getWeiShiArticleInfo (opts) {
        let self = this;
        let context = self.context;
        let uri = opts.uri;
        let info = {
            title: "",
            content: "",
            excerpt: "",
            uri: uri
        };

        return _co(function* () {
            let $ = yield self.loadUri({uri: uri});

            info.title = $("#title").text();
            info.$content = $("#content");

            return info;
        });
    }

    getNewsListArticleInfo (opts) {
        let self = this;
        let context = self.context;
        let uri = opts.uri;
        let info = {
            title: "",
            content: "",
            excerpt: "",
            uri: uri
        };

        return _co(function* () {
            let $ = yield self.loadUri({uri: uri});

            info.title = $(".article-content h1").text();
            info.$content = $(".article-content .content-text");

            return info;
        });
    }

    getArticleInfo (opts) {
        let self = this;
        let context = self.context;
        let uri = opts.uri;
        let info = null;

        return _co(function* () {
            self.logger.debug(``);
            if(uri.indexOf('newslist') !== -1) {
                info = yield self.getNewsListArticleInfo({
                    uri: uri
                });
            } else if(uri.indexOf('news.html') !== -1) {
                info = yield self.getWeiShiArticleInfo({
                    uri: uri
                });
            } else {
                self.logger.error(`uri: ${uri} is unknown type!`);
            }

            yield self.baseHtmlProcess({$content: info.$content, uri: uri});
            let replaceInfo = yield self.procContentImgs({$html: info.$content});
            info.content = self.filterHtml(replaceInfo.html);
            // info.content = info.content + `<p>本文出处：<a href='${uri}' target='_blank'>${uri}</a></p>`;
            info.excerpt = self.getExcerpt(info.$content.text());

            return info;
        });
    }
}

module.exports = DongTai;