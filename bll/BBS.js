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
            let articleInfo = yield self.getArticleInfo({threadUri: uri});

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

    getConfigByThreadTitle (opts) {
        let threadTitle = opts.threadTitle;
        let config = _.find(configs, config => {
            return config.name === threadTitle;
        });

        if(!config) {
            throw new Error(`can't find config in bbsUris.json by threadTitle: ${threadTitle}.`);
        }
        return config;
    }

    getThreadSubject (opts) {
        let self = this;
        let $ = opts.$;
        let threadTitle = opts.threadTitle;
        let subject = $('#thread_subject').text() || "";
        let config = self.getConfigByThreadTitle({threadTitle: threadTitle});
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

    getPostDivs (opts) {
        let $ = opts.$;
        return $("#postlist").children("div[id*=post_]");
    }

    //保留strong标签内容
    retainStrong ($div) {
        let $strongs = $div.find('strong');

        if($strongs.length > 0) {
            for (let i = 0; i<$strongs.length; i++) {
                let $ele = $strongs.eq(i);

                cheerio.load("<div>[strong]</div>").insertBefore($ele);
                cheerio.load("<div>[/strong]</div>").insertBefore($ele);
            }
        }
    }

    retainCenterFont ($div)  {
        let $centerFonts = $div.find("div[align='center']");

        for(var i=0; i<$centerFonts.length; i++) {
            if($centerFonts.eq(i).children('font').length === 1) {
                cheerio.load("<div>[center]</div>").insertBefore($centerFonts.eq(i));
                cheerio.load("<div>[/center]</div>").insertBefore($centerFonts.eq(i));
            }
        }
    }

    removeExcess ($div) {
        let self = this;
        self.retainCenterFont($div);
        self.retainStrong($div);
        $div.find(".pstatus").remove();
        $div.find('.quote').remove();   //去掉引用显示
        $div.find('.authi').remove();   //除去发表时间
        $div.find('style').remove();    //删除样式代码
        $div.find('script').remove();    //删除样式代码
        $div.find("div[class='ptg mbm']").remove();  //删除关键字
        $div.find('#k_favorite').remove();  //删除收藏
        $div.find('#sh_sina_thread').remove();  //删除分享
        $div.find('#recommend_add').remove();   //删除支持
        $div.find('#recommend_subtract').remove();  //删除反对
        $div.find('.plc .plm').remove();  //删除相关帖子
        $div.find('.shareBox').remove();  //删除分享
        $div.find("div[id^=aimg_]").remove();   //删除上传图片下载提示层
        $div.find("div[id^=comment_]").remove();    //删除点评
        $div.find("a[class=xw1]").remove();     //删除用户帖子上传图片说明
        $div.find("em[class=xg1]").remove();    //删除用户帖子上传图片说明
        $div.find("div[class=tip_c]").remove(); //删除用户帖子上传图片说明
        $div.find("div[class='tip tip_4 aimg_tip'][disautofocus='true']").remove(); //删除智能社区图片下面的下载和上传信息
        $div.find("div[class='modact']").remove();  //删除智能社区添加图章的内容
        $div.find("div[class='article-functions']").remove(); //删除结尾回复 评论 点赞等
        $div.find("div[class='po phoneversion']").remove(); //删除来之XXX版本手机终端
        $div.find("dl[class='rate']").remove();  //删除首帖下面的评分信息
    }

    isWorkerReply (opts) {
        let self = this;
        let context = self.context;
        let $div = opts.$div;

        let content = $div.find("font").html();
        self.logger.debug(`content: ${content}`);
        let indexOf = ['产品答疑师', '工作人员', '社区管家', '实习版主', '版主'].indexOf(content);
        self.logger.debug(`['产品答疑师', '工作人员', '社区管家', '实习版主', '版主'] indexOf is: ${indexOf}`);

        return indexOf > -1;
    }

  quote_content_format: (attrs, cb) ->
    self = @
    content = attrs.content
    color = attrs.color
    block = attrs.block
    self.content_format content, color, (err, content) ->
      return cb(err) if err
      if self.$(content).text().trim() isnt ""
        content = block.replace("[[content]]", content)
      else
        content = ""
      return cb(null, content)

    getPostContent (opts) {
        let self = this;
        let context = self.context;
        let $div = opts.$div;
        let divIndex = opts.divIndex;
        let threadPageNum = opts.threadPageNum;

        return _co(function* () {
            self.removeExcess($div);
            let $firstTr = $div.find('table').eq(0).find("tr:first");
            if(!$firstTr) {
                throw new Error("can not find $firstTr");
            }

            let $secondTd = $firstTr.find('.plc').eq(0);
            if(!$secondTd) {
                throw new Error("can not find $secondTd");
            }

            let $secondDiv = $secondTd.children('div[class=pct]').eq(0);
            if(!$secondDiv) {
                throw new Error("can not find $secondDiv");
            }

            let isWorkerReply = self.isWorkerReply({$div: $div});
            self.logger.debug(`is_worker_reply: ${isWorkerReply}`);

            yield self.procContentImgs({$html: $div});


        });

      //   attrs =
      //     content: $second_div.text()
      //     color: null
      //     block: "[[content]]"
      //   if self.is_first_page() and index is 0
      //       unless self.keys.IS_NEWS
      //         attrs.color = GREEN_360
      //         self.quote_content_format attrs, cb
      //       else
      //         attrs.block = "[[content]]"
      //         self.quote_content_format attrs, cb
      //   else if is_worker_reply
      //     attrs.color = RED_COLOR
      //     attrs.block = "[[content]]"
      //     self.quote_content_format attrs, cb
      //   else
      //     attrs.block = "[[content]]"
      //     self.quote_content_format attrs, cb
    }

  // #获得回复的html内容
  // get_post_content: ($post, index, cb) ->
  //   self = @
  //   self.remove_excess $post
  //   $first_tr = $post.find('table').eq(0).find("tr:first")

  //   return cb('failed') unless $first_tr
  //   $second_td = $first_tr.find('.plc').eq(0)
  //   return cb('failed') unless $second_td
  //   $second_div = $second_td.children('div[class=pct]').eq(0)
  //   return cb('failed') unless $second_div
  //   is_worker_reply = self.is_worker_reply($post)
  //   console.log("is_worker_reply:", is_worker_reply)
  //   self.mark_imgs($second_div)
  //   attrs =
  //     content: $second_div.text()
  //     color: null
  //     block: "[[content]]"
  //   if self.is_first_page() and index is 0
  //       unless self.keys.IS_NEWS
  //         attrs.color = GREEN_360
  //         self.quote_content_format attrs, cb
  //       else
  //         attrs.block = "[[content]]"
  //         self.quote_content_format attrs, cb
  //   else if is_worker_reply
  //     attrs.color = RED_COLOR
  //     attrs.block = "[[content]]"
  //     self.quote_content_format attrs, cb
  //   else
  //     attrs.block = "[[content]]"
  //     self.quote_content_format attrs, cb


    getThreadContent (opts) {
        let self = this;
        let context = self.context;
        let threadPageNum = self.threadPageNum;
        let needReply = opts.needReply;
        let $ = opts.page$;
        let postDivs = self.getPostDivs({$: $});

        return _co(function* () {
            self.logger.debug(`current page reply amount is: ${postDivs.length}`);
            if(postDivs.length) {
                throw _utils.createError("Can not find post divs.");
            }

            let maxPostNum = needReply ? postDivs.length : 1;
            let divContents = [];
            for(var i=0; i<maxPostNum; i++) {
                let content = yield self.getPostContent({
                    $div: postDivs.eq(i),
                    divIndex: i,
                    threadPageNum: threadPageNum
                });
                divContents.push(content);
            }
        });
    }

    getArticleInfo (opts) {
        let self = this;
        let context = self.context;
        let threadUri = opts.threadUri;
        let info = {
            title: "",
            content: "",
            excerpt: "",
            uri: threadUri
        };

        return _co(function* (argument) {
            let $ = yield self.loadUri({uri: threadUri});
            let threadTitle = self.getThreadTitle($);
            let threadPageCount = self.getThreadMaxPageCount($);
            let config = self.getConfigByThreadTitle({threadTitle: threadTitle});

            info.title = self.getThreadSubject({
                $: $,
                threadTitle: threadTitle
            });

            //不需要回复，则只爬第一页
            if(!config.needReply) {
                threadPageCount = 1;
            }

            let content = [];
            for(var pageNum=1; pageNum<=threadPageCount; pageNum++) {
                let pageCheerio = $;

                if(pageNum !== 1) {
                    let pageUri = self.getThreadPageUrl({
                        pageUrl: threadUri,
                        pageNum: pageNum
                    });
                    pageCheerio = self.loadUri({uri: pageUri});
                } else {
                    pageCheerio = $;
                }

                let childPageContent = yield self.getThreadContent({
                    page$: pageCheerio,
                    needReply: config.needReply,
                    threadPageNum: pageNum
                });
            }

            // info.$content = $("#article_box");
            // info.$content.find("#article_box h2").eq(0).remove();
            // info.$content.find(".article-msg").remove();
            // info.$content.find("hr").remove();

            // yield self.baseHtmlProcess({$content: info.$content});
            // let replaceInfo = yield self.procContentImgs({$html: info.$content});
            // info.content = replaceInfo.html;
            // info.excerpt = self.getExcerpt(info.$content.text());

            return info;
        });
    }
}

module.exports = BBS;