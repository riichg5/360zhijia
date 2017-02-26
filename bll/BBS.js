let Base = require('./Base');
let cheerio = require('cheerio');
let request = require('request-promise');
let Promise = require('bluebird');
let url = require('url');
let configs = require(_base + 'config/bbsUris.json');

class BBS extends Base {
	constructor(opts) {
        let context = opts.context;
        let config = opts.config;

		super(context);
        this.name = config.name;
        this.uri = config.uri;
        this.needReply = config.needReply;
        this.priority = config.priority;
        this.cron = config.cron;
        this.tagIds = config.tagIds;
        this.categoryId = config.categoryId;
        this.topImg = config.topImg;
        this.deepPageCount = config.deepPageCount || 999;
	}

    //出口方法
    begin (opts)  {
        let self = this;
        let context = self.context;
        let createMsgFunc = opts.createMsgFunc;

        return _co(function* () {
            //循环最大deep page
            for(var forumPageNum=1; forumPageNum <= self.deepPageCount; forumPageNum++) {
                let $ = null;

                if(forumPageNum === 0) {
                    self.logger.debug(`first forum page uri is: ${self.uri}`);
                    $ = yield self.loadUri({uri: self.uri});
                } else {
                    let uri = self.getForumPageUrl({pageUrl: self.uri, pageNum: forumPageNum});
                    self.logger.debug(`forum page number is: ${forumPageNum}, uri is: ${uri}`);
                    $ = yield self.loadUri({uri: uri});
                }

                let uris = self.getForumResolvedUris($) || [];

                self.logger.debug(`get uris: ${uris}`);
                for(var i=0; i< uris.length; i++) {
                    yield createMsgFunc({
                        name: self.name,
                        priority: self.priority,
                        uri: uris[i],
                        needReply: opts.needReply
                    });
                }
            }
            return;
        });
    }

    //excute 方法
    procArticle (opts) {
        let self = this;
        let context = self.context;
        let uri = opts.uri;
        let needReply = opts.needReply;

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

    isForum (uri) {
        return uri.indexOf('forum') !== -1;
    }

    isThread (uri) {
        return uri.indexOf('thread') !== -1;
    }

    getForumTitle ($) {
        let title = $("a.forum-title").text();

        this.logger.debug(`forum title is: ${title}`);
        return title;
    }

    getThreadTitle ($) {
        let breadcrumbs = $("#pt-detail").find("a");

        if(breadcrumbs.length === 0) {
            return null;
        }

        let title = breadcrumbs.eq(breadcrumbs.length - 1).text();
        this.logger.debug(`thread title is: ${title}`);
        return title;
    }

    getThreadSubject (opts) {
        let $ = opts.$;
        let threadTitle = opts.threadTitle;
        let subject = $('#thread_subject').text() || "";
        let config = _.find(configs, config => {
            return config.name === threadTitle;
        });

        if(!config) {
            throw new Error("can't find config in bbsUris.json.");
        }

        let keyWords = config.keyWords || [];
        let isContains = false;
        let lowercase = subject.toLowerCase();

        for(var i=0; i<keyWords.length; i++) {
            if(lowercase.indexOf(keyWords[i]) !== -1) {
                isContains = true;
                break;
            }
        }

        if(!isContains) {
            subject = `${threadTitle}${subject}`;
        }
        return subject;
    }

    getFormMaxPageCount ($) {
        let self = this;
        let context = self.context;
        let pageText = $("span[title^='共']").eq(0);

        if(pageText && pageText.length !== 0) {
            let maxPage = parseInt(_.trim(pageText.text().replace(/页/gi,"").replace(/\//gi, "")), 10);
            self.logger.debug(`current page count: ${maxPage}`);
            return maxPage;
        } else {
            self.logger.debug(`current page count: 1`);
            return 1;
        }
    }

    getThreadMaxPageCount ($) {
        let self = this;
        let context = self.context;
        let count = 1;

        if(!self.needReply) {
            count = 1;
        }
        count = self.getFormMaxPageCount($);
        return count;
    }

    getUrlByPath (path) {
        let self = this;
        path = _.trim(path);
        if(path.indexOf('http') === 0) {
            return path;
        }

        let urlInfo = url.parse(this.uri);
        let uri = url.resolve(`${urlInfo.protocol}\/\/${urlInfo.host}`, path);

        self.logger.debug(`uri is: ${uri}`);
        return uri;
    }

    getForumResolvedUris ($) {
        let self = this;
        let context = self.context;
        let posts = $("#moderate tr");
        let uris = [];

        _.each(posts, post => {
            let img = null;
            let img_reply = post.find("th img[alt='已答复']");
            let img_resolve = post.find("th img[alt='已解决']");
            let img_confirm = post.find("th img[alt='确认解决']");
            let img_请补充 = post.find("th img[alt='请补充']");
            let img_已收录 = post.find("th img[alt='已收录']");
            let img_版主推荐 = post.find("th img[alt='版主推荐']");

            if(img_reply.length > 0) {
                img = img_reply;
            } else if(img_resolve.length > 0) {
                img = img_resolve;
            } else if(img_confirm.length > 0) {
                img = img_confirm;
            } else if(img_请补充.length > 0) {
                img = img_请补充;
            } else if(img_已收录.length > 0) {
                img = img_已收录;
            } else if(img_版主推荐.length > 0) {
                img = img_版主推荐;
            }

            if(img) {
                let postLink = img.eq(0).prev('a').first();
                if(postLink) {
                    uris.push(self.getUrlByPath(postLink.attr("href")));
                }
            }
        });
        return uris;
    }

    getForumPageUrl (opts) {
        let self = this;
        let context = self.context;
        let pageNum = opts.pageNum;
        let pageUrl = opts.pageUrl;
        let s1, s2, s3, num, suffix;

        [s1, s2, s3] =  pageUrl.split('-');
        [num, suffix] = s3.split('.');

        s3 = `${pageNum}.${suffix}`;
        return [s1, s2, s3].join("-");
    }

    //将 http://bbs.360safe.com/thread-4973611-1-1.html  转化为 http://bbs.360safe.com/thread-4973611-#{page_num}-1.html
    getThreadPageUrl (opts) {
        let self = this;
        let url = opts.pageUrl;
        let pageNum = opts.pageNum;
        let splits = url.split('-');

        splits[2] = `${pageNum}`;
        return splits.join('-');
    }

    getThreadContent (opts) {
        let self = this;
        let context = self.context;

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
            let threadTitle = self.getThreadTitle($);

            info.title = self.getThreadSubject({
                $: $,
                threadTitle: threadTitle
            });
            info.$content = $("#article_box");
            info.$content.find("#article_box h2").eq(0).remove();
            info.$content.find(".article-msg").remove();
            info.$content.find("hr").remove();

            yield self.baseHtmlProcess({$content: info.$content});
            let replaceInfo = yield self.procContentImgs({$html: info.$content});
            info.content = replaceInfo.html;
            info.excerpt = self.getExcerpt(info.$content.text());

            return info;
        });
    }
}

module.exports = BBS;