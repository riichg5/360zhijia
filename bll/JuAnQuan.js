/*
    阿里巴巴聚安全
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
        this.defaultImg = "<a href=\"/wp-content/uploads/pics/alijuanquan.jpg\"><img class=\"aligncenter size-medium wp-image-179507\" src=\"/wp-content/uploads/pics/alijuanquan.jpg\" alt=\"阿里聚安全\" width=\"360\" height=\"175\" /></a>";
	}

    getUri (opts) {
        let url = opts.url;

        return `http://jaq.alibaba.com${url}`;
    }

    //安全资讯
    getAnquanArticleListUri () {
        return `http://jaq.alibaba.com/community/api/article?catid=17&start=0&num=20`;
    }

    //技术研究
    getJiShuArticleListUri () {
        return `http://jaq.alibaba.com/community/api/article?catid=4&start=0&num=20`;
    }

    //出口方法
    getArticleList () {
        let self = this, context = self.context;

        return _co(function* () {

            let [res1, res2] = yield [
                self.loadJSON({
                    uri: self.getAnquanArticleListUri(),
                    isJsonResponse: true
                }),
                self.loadJSON({
                    uri: self.getJiShuArticleListUri(),
                    isJsonResponse: true
                }),
            ];

            let urls = [];
            // self.logger.debug(`---------> res1.articlelist:`, _utils.inspect({obj: res1.articlelist}));
            for(let item of res1.articlelist) {
                let uri = self.getUri({url: item.url});
                urls.push(uri);
            }
            for(let item of res2.articlelist) {
                let uri = self.getUri({url: item.url});
                urls.push(uri);
            }

            urls = _.uniq(_.compact(urls));
            self.logger.debug(`---->alibaba urls: ${urls}`);
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

    getContentHtml (jsonRes) {
        if(jsonRes.content) {
            return jsonRes.content;
        }

        if(jsonRes.posts) {
            let content = [];
            let posts = jsonRes.posts.activity.concat(jsonRes.posts.knowledge || []).concat(jsonRes.posts.news || []);

            content.push(`
                <p style="text-align: center; text-indent: 0em;"><strong><img title="360网络安全周报" src="${jsonRes.cover}" alt="${jsonRes.cover}" /></strong></p>
            `);

            for(let item of posts) {
                content.push(`
                    <h2 name="h2-0" id="h2-0">${item.title}</h2>
                    <p style="text-align: center; text-indent: 0em;"><strong><img title="${item.title}" src="${item.cover}" alt="${item.cover}" /></strong></p>
                    <p style="text-align: left;">${item.desc}</p>
                `);
                if(item.url) {
                    content.push(`<p style="text-align: left;">文章地址：<a href='${item.url}' target='_blank'>${item.url}</a></p>`);
                }
                content.push(`<p style="text-align: left;"><span style="font-size: 18px;">&nbsp;</span></p>`);
            }

            return content.join('');
        }

        return '';
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


            info.title = $("h2.article-title").eq(0).text().trim();
            info.$content = $("div.article-content").eq(0);

            // yield self.baseHtmlProcess({$content: info.$content, uri: uri});
            let replaceInfo = yield self.procContentImgs({$html: info.$content, uri: uri});
            info.content = self.addDefaultImg(self.filterHtml(replaceInfo.html));
            info.excerpt = self.getExcerpt(info.$content.text());

            return info;
        });
    }
}

module.exports = AnQuan;