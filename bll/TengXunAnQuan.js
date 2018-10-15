/*
    腾讯安全应急相应中心
    https://security.tencent.com/index.php/blog
*/

let Base = require('./Base');

class TengXunAnQuan extends Base {
    constructor(context) {
        super(context);
        this.tagIds = [510];
        this.categoryId = 510;
        this.domain = "security.tencent.com";
    }

    //出口方法
    getArticleList () {
        let self = this;

        return _co(function* () {
            let pageUrls = [
                "https://security.tencent.com/index.php/blog/"
            ];

            self.logger.debug(`pageUrls: ${pageUrls}`);

            let urls = [];
            for(let uri of pageUrls) {
                let $ = yield self.loadUri({uri: uri});
                let aLinks = $(".content_title a");

                aLinks.each((i, link) => {
                    if(link && link.attribs && link.attribs.href) {
                        urls.push(`https://${self.domain}/${link.attribs.href}`);
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

            info.title = $("h1.title_content").eq(0).text();

            let $content = $(".markdown-body");
            info.$content = $content.eq(0);

            info.excerpt = self.getExcerpt(info.$content.text());

            yield self.baseHtmlProcess({$content: info.$content, uri: uri});
            let replaceInfo = yield self.procContentImgs({$html: info.$content, uri: uri});
            info.content = self.filterHtml(replaceInfo.html);
            info.content = info.content + `<p>本文来源于腾讯安全应急响应中心，原文地址：<a href='${uri}' target='_blank'>${uri}</a></p>`;

            return info;
        });
    }

}

module.exports = TengXunAnQuan;