/*
    先知社区
    https://xz.aliyun.com/
*/

let Base = require('./Base');

class AnQuan extends Base {
    constructor(context) {
        super(context);
        this.tagIds = [510];
        this.categoryId = 510;
        this.domain = "xz.aliyun.com";
    }

    //出口方法
    getArticleList () {
        let self = this;

        return _co(function* () {
            let pageUrls = [
                "https://xz.aliyun.com/"
            ];

            self.logger.debug(`pageUrls: ${pageUrls}`);

            let urls = [];
            for(let uri of pageUrls) {
                let $ = yield self.loadUri({uri: uri});
                let aLinks = $(".topic-title");

                aLinks.each((i, link) => {
                    if(link && link.attribs && link.attribs.href) {
                        urls.push(`https://${self.domain}${link.attribs.href}`);
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

    //判断是否有pre标签，添加SyntaxHighlighter
    addMarkdownCss (opts) {
        let self = this;
        let $content = opts.$content;

        if($content.has("pre")) {
            let config = _config.get("editormd");
            self.logger.debug("find editormd pre tag.");
            $content.append(`<link type="text/css" href="${config.miniCss}" rel="stylesheet">`);
            // $content.append(`<link type="text/css" href="${config.css}" rel="stylesheet">`);
            // $content.append(`<script type="text/javascript" src="${config.js}"></script>`);
            // $content.append(`<script type="text/javascript">SyntaxHighlighter.all();</script>`);
            self.logger.debug("add css and js of editormd");
        }
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

            info.title = $(".content-title").eq(0).text();

            let $content = $("#topic_content");
            info.$content = $content.eq(0);

            info.excerpt = self.getExcerpt(info.$content.text());

            self.addMarkdownCss({$content: $content});
            let replaceInfo = yield self.procContentImgs({$html: info.$content, uri: uri});
            info.content = self.filterHtml(replaceInfo.html);
            info.content = info.content + `<p>本文来源于先知社区，原文地址：<a href='${uri}' target='_blank'>${uri}</a></p>`;
            info.content = `<div class="markdown-body">${info.content}</div>`;

            return info;
        });
    }
}

module.exports = AnQuan;