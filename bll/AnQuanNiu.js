/*
    安全牛
    https://www.aqniu.com/
*/

let Base = require('./Base');

class AnQuan extends Base {
    constructor(context) {
        super(context);
        this.tagIds = [510];
        this.categoryId = 510;
        this.domain = "www.aqniu.com";
    }

    //出口方法
    getArticleList () {
        let self = this;

        return _co(function* () {
            let pageUrls = [
                "https://www.aqniu.com/category/news-views",
                "https://www.aqniu.com/category/industry",
                "https://www.aqniu.com/category/threat-alert",
                "https://www.aqniu.com/category/learn",
                "https://www.aqniu.com/category/hack-geek",
                "https://www.aqniu.com/category/tools-tech"
            ];

            self.logger.debug(`pageUrls: ${pageUrls}`);

            let urls = [];
            for(let uri of pageUrls) {
                let $ = yield self.loadUri({uri: uri});
                let aLinks = $("h4 a");

                aLinks.each((i, link) => {
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

        return _co(function* (argument) {
            let $ = yield self.loadUri({uri: uri});

            info.title = $("h2").eq(0).text() || "";
            if(info.title.length === 0) {
                info.title = $(".blog-title").text();
            }
            // info.excerpt = $(".content .desc").eq(0).text();

            let $content = $(".blog-excerpt");
            $content.find(".blog-single-head").remove();
            $content.find('span').removeAttr("style");
            $content.find('img').removeAttr("srcset");
            $content.find("p:contains('相关阅读')").eq(0).next().remove();
            $content.find("p:contains('相关阅读')").eq(0).remove();
            info.$content = $content.eq(0);

            info.excerpt = self.getExcerpt(info.$content.text());

            let replaceInfo = yield self.procContentImgs({$html: info.$content, uri: uri});
            info.content = self.filterHtml(replaceInfo.html);
            info.content = info.content + `<p>本文来源于安全牛，原文地址：<a href='${uri}' target='_blank'>${uri}</a></p>`;

            return info;
        });
    }
}

module.exports = AnQuan;