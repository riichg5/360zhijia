/*
	腾讯安全资讯
	https://guanjia.qq.com/news/n0/list_0_1.html
*/

let Base = require('./Base');
let cheerio = require('cheerio');
let request = require('request-promise');
let Promise = require('bluebird');

class AnQuan extends Base {
	constructor(context) {
		super(context);
        this.tagIds = [510];
        this.categoryId = 510;
        this.defaultImg = "<a href=\"http://www.360zhijia.com/wp-content/uploads/2017/04/qqguanjia.jpg\"><img class=\"aligncenter size-medium wp-image-192571\" src=\"http://www.360zhijia.com/wp-content/uploads/2017/04/qqguanjia-300x175.jpg\" alt=\"\" width=\"300\" height=\"175\" /></a>";
        this.domain = "guanjia.qq.com";
	}

    getUri (opts) {
    	let self = this;
        let pageNum = opts.pageNum;

        //https://guanjia.qq.com/news/n0/list_0_1.html
        return `https://${self.domain}/news/n0/list_0_${pageNum}.html`;
    }

    //出口方法
    getArticleList () {
        let self = this;
        let context = self.context;
        let endPageNum = 1;

        return _co(function* () {
        	let pageUrls = [];

        	for(let i=1; i<=endPageNum; i++) {
        		pageUrls.push(self.getUri({
        			pageNum: i
        		}));
        	}

        	self.logger.debug(`pageUrls: ${pageUrls}`);

            let urls = [];
            for(let uri of pageUrls) {
                let $ = yield self.loadUri({uri: uri});
                let aLinks = $(".tabs_mod a");

                aLinks.each((i, link) => {
                    if(link && link.attribs && link.attribs.href) {
                        if(link.attribs.href.indexOf('http:') === -1) {
                            urls.push(`https://${self.domain}${link.attribs.href}`);
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

        return _co(function* (argument) {
            let $ = yield self.loadUri({uri: uri});

            info.title = $("h1").eq(0).text();
            info.excerpt = $(".content .desc").eq(0).text();
            info.$content = $(".content .news_content").eq(0);

            // yield self.baseHtmlProcess({$content: info.$content, uri: uri});
            let replaceInfo = yield self.procContentImgs({$html: info.$content, uri: uri});
            info.content = self.addDefaultImg(self.filterHtml(replaceInfo.html));

            return info;
        });
    }
}

module.exports = AnQuan;