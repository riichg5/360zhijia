let Base = require('./Base');
let cheerio = require('cheerio');
let request = require('request-promise');
let Promise = require('bluebird');

class RuiXing extends Base {
	constructor(context) {
		super(context);
        this.uris = [
            "http://it.rising.com.cn/bobao/index.html",
            "http://it.rising.com.cn/anquan/index.html",
            "http://it.rising.com.cn/dongtai/index.html"
        ];
        this.tagIds = [8];
        this.categoryId = 8;
        this.defaultImg = "<a href=\"http://www.360zhijia.com/wp-content/uploads/2017/04/ruixing.jpg\"><img class=\"aligncenter size-medium wp-image-191644\" src=\"http://www.360zhijia.com/wp-content/uploads/2017/04/ruixing-300x241.jpg\" alt=\"\" width=\"300\" height=\"241\" /></a>";
	}

    addDefaultImg (html) {
        let self = this;

        if(html.indexOf('<img') === -1 ||
            html.indexOf('<IMG') === -1) {
            return "<p>" + self.defaultImg + "</p>" + html;
        }

        return html;
    }

    //出口方法
    getArticleList () {
        let self = this;
        let context = self.context;

        return _co(function *() {
            let urls = [];
            for(let uri of self.uris) {
                let $ = yield self.loadUri({uri: uri});
                let aLinks = $(".news a[href*='it.rising.com.cn']");
                let aLinks1 = $(".news a[href*='mp.weixin.qq.com']");

                aLinks.each((i, link) => {
                    if(link && link.attribs && link.attribs.href) {
                        urls.push(link.attribs.href);
                    }
                });

                aLinks1.each((i, link) => {
                    if(link && link.attribs && link.attribs.href) {
                        urls.push(link.attribs.href);
                    }
                });
            }

            urls = _.uniq(_.compact(urls));
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

        return _co(function *(argument) {
            let $ = yield self.loadUri({uri: uri});

            if(uri.indexOf('weixin') !== -1) {
                info.title = $("#activity-name").text();
                info.$content = $("#js_content");
            } else if(uri.indexOf('rising') !== -1) {
                info.title = $("article").find("h1").eq(0).text();
                info.$content = $("article");
                info.$content.find("h1").eq(0).remove();
                info.$content.find("p.small").eq(0).remove();
                info.$content.find("div.sharebaidu").remove();
            }

            yield self.baseHtmlProcess({$content: info.$content, uri: uri});
            let replaceInfo = yield self.procContentImgs({$html: info.$content, uri: uri});
            info.content = self.addDefaultImg(self.filterHtml(replaceInfo.html));
            info.excerpt = self.getExcerpt(info.$content.text());

            return info;
        });
    }
}

module.exports = RuiXing;