let Base = require('./Base');
let cheerio = require('cheerio');
let request = require('request-promise');
let Promise = require('bluebird');
let path = require('path');

class JinShan extends Base {
	constructor(context) {
		super(context);
        this.uris = [
            "http://www.ijinshan.com/info/"
        ];
        this.domain = 'www.ijinshan.com';
        this.tagIds = [8];
        this.categoryId = 8;
        this.defaultImg = `<a href="http://www.360zhijia.com/wp-content/uploads/2017/06/jinshan_400.jpg"><img class="aligncenter size-medium wp-image-237096" src="http://www.360zhijia.com/wp-content/uploads/2017/06/jinshan_400-300x133.jpg" alt="金山安全" width="300" height="133" /></a>`;
	}

    addDefaultImg (html) {
        let self = this;

        if(html.indexOf('<img') === -1) {
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
                let aLinks = $("ul[class='info-list'] a");

                aLinks.each((i, link) => {
                    if(link && link.attribs && link.attribs.href) {
                        if(link.attribs.href.indexOf('http:') === -1) {
                            urls.push(`http://${self.domain}${link.attribs.href}`);
                        } else {
                            urls.push(link.attribs.href);
                        }
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

            info.title = $("h1").eq(0).text();
            info.$content = $(".cnt-bd").eq(0);

            yield self.baseHtmlProcess({$content: info.$content, uri: uri});
            let replaceInfo = yield self.procContentImgs({$html: info.$content, uri: uri});
            info.content = self.addDefaultImg(self.filterHtml(replaceInfo.html));
            info.excerpt = self.getExcerpt(info.$content.text());

            return info;
        });
    }
}

module.exports = JinShan;