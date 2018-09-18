let Base = require('./Base');
let cheerio = require('cheerio');
let request = require('request-promise');
let Promise = require('bluebird');

class AnQuan extends Base {
	constructor(context) {
		super(context);
        // this.uri = "https://api.anquanke.com/data/v1/post?id=";
        this.tagIds = [510];
        this.categoryId = 510;
        this.dal = this.DAL.createAnQuan(context);
	}

    getUri (id) {
        return `https://api.anquanke.com/data/v1/post?id=${id}`;
    }

    getArticleListUri (id) {
        return `https://api.anquanke.com/data/v1/posts?page=1&size=30`;
    }

    //出口方法
    getArticleList () {
        let self = this, context = self.context;

        return _co(function* () {
            let res = yield self.loadJSON({
                uri: self.getArticleListUri(),
                isJsonResponse: true
            });

            let urls = [];
            for(let item of res.data) {
                let uri = self.getUri(item.id);
                urls.push(uri);
            }

            urls = _.uniq(_.compact(urls));
            self.logger.debug(`----> anquan urls: ${urls}`);
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
        let id = uri.split('id=')[1];
        let info = {
            title: "",
            content: "",
            excerpt: "",
            uri: uri
        };

        return _co(function *(argument) {
            let res = yield self.loadJSON({
                uri: uri,
                isJsonResponse: true
            });

            info.title = res.title;

            let htmlContent = self.getContentHtml(res);
            self.logger.debug(`============>res.content: ${htmlContent}`);
            info.$content = cheerio.load(htmlContent).root();

            yield self.baseHtmlProcess({$content: info.$content, uri: uri});
            let replaceInfo = yield self.procContentImgs({$html: info.$content, uri: uri});
            info.content = self.filterHtml(replaceInfo.html);

            if(res.content) {
                info.content = info.content + `<p>本文来源于360安全客，原文地址：<a href='https://www.anquanke.com/post/id/${id}' target='_blank'>https://www.anquanke.com/post/id/${id}</a></p>`;
            }

            info.excerpt = res.desc; //self.getExcerpt(info.$content.text());

            return info;
        });
    }
}

module.exports = AnQuan;