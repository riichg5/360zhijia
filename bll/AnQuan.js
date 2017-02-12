let Base = require('./Base');
let cheerio = require('cheerio');
let request = require('request-promise');
let Promise = require('bluebird');

class AnQuan extends Base {
	constructor(context) {
		super(context);
        this.uri = "http://bobao.360.cn";
        this.tagIds = [34];
	}

    //出口方法
    getArticleList () {
        let self = this;
        let context = self.context;

        return _co(function *() {
            let $ = yield self.loadUri({uri: self.uri});
            let aLinks = $(".newslist a[href*='bobao.360.cn']");
            let urls = [];

            aLinks.each((i, link) => {
                if(link && link.attribs && link.attribs.href) {
                    urls.push(link.attribs.href);
                }
            });

            urls = _.uniq(_.compact(urls));
            return urls;
        });
    }

    //excute 方法
    procArticle (opts) {
        let self = this;
        let context = self.context;
        let uri = opts.uri;

        return _co(function *() {
            let bArticle = self.BLL.createArticle(context);
            let articleInfo = yield self.getArticleInfo({uri: uri});

            self.logger.debug("start add article to db.");
            yield bArticle.addOne({
                subject: articleInfo.title,
                content: articleInfo.content,
                uri: articleInfo.uri,
                tagIds: self.tagIds
            });

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
            uri: uri
        };

        return _co(function *(argument) {
            let $ = yield self.loadUri({uri: uri});

            info.title = $("#article_box h2").eq(0).text();
            info.$content = $("#article_box");
            info.$content.find("#article_box h2").eq(0).remove();
            info.$content.find(".article-msg").remove();

            let replaceInfo = yield self.procContentImgs({$html: info.$content});
            info.content = replaceInfo.html;

            return info;
        });
    }
}

module.exports = AnQuan;