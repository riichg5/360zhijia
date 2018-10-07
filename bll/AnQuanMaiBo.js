/*
    安全脉搏
    https://www.secpulse.com/
*/

let Base = require('./Base');
let cheerio = require('cheerio');
let request = require('request-promise');
let Promise = require('bluebird');

class AnQuanMaiBo extends Base {
    constructor(context) {
        super(context);
        // this.uri = "https://api.anquanke.com/data/v1/post?id=";
        this.tagIds = [510];
        this.categoryId = 510;
    }

    getArticleListUri (id) {
        return `https://www.secpulse.com/newpage/ajax_content`;
    }

    //出口方法
    getArticleList () {
        let self = this, context = self.context;

        return _co(function* () {
            let htmlContent = yield self.loadJSON({
                uri: self.getArticleListUri(),
                isJsonResponse: false
            });

            let $html = cheerio.load(htmlContent).root();
            let aLinks = $html.find("a.title");
            let urls = [];

            aLinks.each((i, link) => {
                if(link && link.attribs && link.attribs.href) {
                    urls.push(link.attribs.href);
                }
            });

            urls = _.uniq(_.compact(urls));
            self.logger.debug(`----> anquanmaibo urls: ${urls}`);
            return urls;
        });
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
        let info = {
            title: "",
            content: "",
            excerpt: "",
            uri: uri
        };

        return _co(function* (argument) {
            let $ = yield self.loadUri({uri: uri});

            info.title = $("h1").eq(0).text();

            let $content = $(".left-9-code");
            info.$content = $content.eq(0);

            info.excerpt = self.getExcerpt(info.$content.text());

            yield self.baseHtmlProcess({$content: info.$content, uri: uri});
            let replaceInfo = yield self.procContentImgs({$html: info.$content, uri: uri});
            info.content = self.filterHtml(replaceInfo.html);
            info.content = info.content + `<p>本文来源于安全脉搏，原文地址：<a href='${uri}' target='_blank'>${uri}</a></p>`;

            return info;
        });
    }
}

module.exports = AnQuanMaiBo;