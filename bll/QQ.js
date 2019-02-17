let Base = require('./Base');
let cheerio = require('cheerio');
let request = require('request-promise');
let url = require('url');
let configs = require(_base + 'config/qqUris.json');

const RED_COLOR = "#ff0000";
const GREEN_360 = "#008000";
const IMG_MARK = "[[[img{pos}]]]";

class QQ extends Base {
	constructor(opts) {
        let context = opts.context;
        let config = opts.config;

		super(context);
        this.name = config.name;
        this.img = config.img;
        this.uri = config.uri;
        this.originUrl = new URL(config.uri).origin;
        this.needReply = config.needReply;
        this.priority = config.priority;
        this.cron = config.cron;
        this.tagIds = config.tagIds;
        this.categoryId = config.categoryId;
        this.topImg = config.topImg;
        this.deepPageCount = config.deepPageCount || 999;
        this.imgUrlsInfos = [];
        this.firstThreadUri = "";
	}

    //出口方法
    begin (opts)  {
        let self = this;
        let context = self.context;
        let createMsgFunc = opts.createMsgFunc;

        return _co(function* () {
            let $firstPage = yield self.loadUri({uri: self.uri});

            console.log(`----> html: ${$firstPage.html()}`);

            let forumMaxPageNum = self.getFormMaxPageCount($firstPage);
            self.logger.debug(`forum max number is: ${forumMaxPageNum}`);
            let maxPageNum = forumMaxPageNum >= self.deepPageCount ? self.deepPageCount : forumMaxPageNum;
            self.logger.debug(`for each maxPageNum is: ${maxPageNum}`);
            //循环最大deep page
            for(var forumPageNum=1; forumPageNum <= maxPageNum; forumPageNum++) {
                let $ = null;

                if(forumPageNum === 0) {
                    self.logger.debug(`first forum page uri is: ${self.uri}`);
                    $ = $firstPage;
                    // $ = yield self.loadUri({uri: self.uri});
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

        self.firstThreadUri = uri;
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
        return this.getThreadTitle($);
    }

    getThreadTitle ($) {
        let breadcrumbs = $(".page_nav").find("a");

        if(breadcrumbs.length < 2) {
            return null;
        }

        let title = breadcrumbs.eq(breadcrumbs.length - 1).text();
        this.logger.debug(`thread title is: ${title}`);
        return title.trim();
    }

    getConfigByThreadTitle (opts) {
        let self = this;
        let threadTitle = opts.threadTitle;
        let config = _.find(configs, config => {
            return config.name === threadTitle;
        });

        if(!config) {
            throw new Error(`can't find config in bbsUris.json by threadTitle: ${threadTitle}. uri: ${self.uri}`);
        }
        return config;
    }

    getThreadSubject (opts) {
        let self = this;
        let $ = opts.$;
        let threadTitle = opts.threadTitle;
        let subject = $(".title span").text().trim(); //$('#thread_subject').text() || "";
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
            subject = config.aliasName+subject.trim();
        }
        return subject;
    }

    getFormMaxPageCount ($) {
        let self = this;
        let context = self.context;

        return 5;
        // let pageText = $("span[title^='共']").eq(0);

        // if(pageText && pageText.length !== 0) {
        //     let maxPage = parseInt(_.trim(pageText.text().replace(/页/gi,"").replace(/\//gi, "")), 10);
        //     self.logger.debug(`current page count: ${maxPage}`);
        //     return maxPage;
        // } else {
        //     self.logger.debug(`current page count: 1`);
        //     return 1;
        // }
    }

    getThreadMaxPageCount ($) {
        let self = this;
        let context = self.context;
        let count = 1;

        //写死
        return 1;

        // if(!self.needReply) {
        //     count = 1;
        // }
        // count = self.getFormMaxPageCount($);
        // return count;
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

    getPureUri (uri) {
        let splits = uri.split('&');
        _.remove(splits, item => {
            return item.indexOf("extra=") !== -1;
        });

        return splits.join('&');
    }

    getForumResolvedUris ($) {
        let self = this;
        let context = self.context;
        $("span[title^='共']").eq(0);
        let posts = $(".threadItem");
        let uris = [];

        for(let i=0; i<posts.length; i++) {
            let img = null;
            let post = posts.eq(i);
            let href = post.find("a[style='color:#2e8b57;']");

            if(href.length) {
                let postLink = href.eq(0);
                if(postLink) {
                    uris.push(self.getPureUri(self.getUrlByPath(postLink.attr("href"))));
                }
            }
        }
        return uris;
    }

    getForumPageUrl (opts) {
        let self = this;
        let pageNum = opts.pageNum;
        let pageUrl = opts.pageUrl;
        let s1, s2, s3, num, suffix;

        [s1, s2, s3] =  pageUrl.split('-');
        [num, suffix] = s3.split('.');

        s3 = `${pageNum}.${suffix}`;
        return [s1, s2, s3].join("-");
    }

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
        return $(".threadItem");
    }

    //保留strong标签内容
    retainStrong ($div) {
        let $strongs = $div.find('strong');

        if($strongs.length > 0) {
            for (let i = 0; i<$strongs.length; i++) {
                let $ele = $strongs.eq(i);

                cheerio("<div>[strong]</div>").insertBefore($ele);
                cheerio("<div>[/strong]</div>").insertAfter($ele);
            }
        }
    }

    retainCenterFont ($div)  {
        let $centerFonts = $div.find("div[align='center']");

        for(var i=0; i<$centerFonts.length; i++) {
            if($centerFonts.eq(i).children('font').length === 1) {
                let $font = $centerFonts.eq(i);
                cheerio("<div>[center]</div>").insertBefore($font);
                cheerio("<div>[/center]</div>").insertAfter($font);
            }
        }
    }

    removeExcess ($div) {
        let self = this;
        self.retainCenterFont($div);
        self.retainStrong($div);
        $div.find("i[class='update']").remove();
        $div.find("div[class='quote quoteItem']").remove();
        $div.find("div[class='clear thread_main_time']").remove();
        $div.find("div[class='thread_foot report']").remove();
    }

    isWorkerReply (opts) {
        let self = this;
        let context = self.context;
        let $div = opts.$div;

        let content = $div.find(".thread_level").text().trim();
        // self.logger.debug(`content: ${content}`);
        let indexOf = content.indexOf("版主");
        self.logger.debug(`['版主'] indexOf is: ${indexOf}`);

        return indexOf !== -1;
    }

    quoteContentFormat (opts) {
        let self = this;
        let content = opts.content;
        let color = opts.color;
        let block = opts.block;

        return _co(function* () {
            let resContent = yield self.contentFormat({content: content, color: color});

            if(cheerio.load(content).text().trim() !== "") {
                resContent = block.replace("[[content]]", resContent);
            } else {
                resContent = "";
            }

            return resContent;
        });
    }

    getColorP (color) {
        if(color) {
            return `<p style='color:${color};'>`;
        }
        return "<p>";
    }

    recoverStrong (text) {
        if(text && text.length > 0) {
            text = text.replace(/\[strong\]/gi, '</p><p><strong>');
            text = text.replace(/\[\/strong\]/gi, '</strong></p><p>');
        }

        return text;
    }

    recoverCenterFont (text) {
        if(text && text.length > 0) {
            text = text.replace(/\[center\]/gi, "<div align='center'>");
            text = text.replace(/\[\/center\]/gi, '</div>');
        }

        return text;
    }

    // //将文本里面的url链接转换为html a标签
    // convertTextToLink (text) {
    //     text.replace(
    //         /((http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?)/gi,
    //         "<a href='$1' target='_blank'>$1</a>"
    //     );
    //     return text;
    // }

    clearTextFromContent (content) {
        content = content.replace(/(>[\s]*(图文转载)[\s\S]*?(<\/div>))/gi, '');
        content = content.replace(/(>[\s]*(转发编辑)[\s\S]*?(<\/div>))/gi, '');
        return content;
    }

    getImgHtml (imgInfo) {
        let self = this;
        let maxImgWidth = _config.get("maxImgWidth");

        imgInfo = self.getImgSize(imgInfo);

        let html = `
            <a href='${imgInfo.imagWebPath}' class='fancybox' data-fancybox-group='button'>
                <img class='aligncenter' src='${imgInfo.imagWebPath}' width='${imgInfo.width}' height='${imgInfo.height}'>
            </a>
        `;

        return html;
    }

    contentFormat (opts) {
        let self = this;
        let content = opts.content;
        let color = opts.color;
        let pHtml = self.getColorP(color);

        return _co(function* () {
            content = content.trim();
            content = content.replace(/^(\n)+/g, "");
            content = content.replace(/(\n)+$/g, "");
            content = pHtml + content + "</p>";
            content = content.replace(/(\n)+/g, `</p>${pHtml}`);
            content = content.replace(/(&nbsp;)/gi, "");
            content = self.recoverStrong(content);
            content = self.recoverCenterFont(content);

            let downloadImgInfos = yield self.downImgs();
            for(let item of downloadImgInfos) {
                let imgHtml = self.getImgHtml(item.info);
                self.logger.debug(`replace image flag, image html code: ${imgHtml}`);
                content = content.replace(IMG_MARK.replace('{pos}', item.pos), imgHtml);
                // console.log(content);
            }

            //下载完图片后一定要清空
            self.imgUrlsInfos = [];
            content = self.replacePhoneNumber(content);
            content = self.replaceWords(content);
            content = self.convertTextToLink(content);
            content = self.clearTextFromContent(content);
            content = content.replace(/<p>\s+/gi, "<p>");        //删除段落前空白字符
            content = content.replace(/<p>\s+<\/p>/gi, "");      //删除空行
            content = content.replace(/<p>\s*<\/p>/gi, "");      //删除空行
            content = content.replace(/<p><\/p>/gi, "");         //删除空行
            content = content.replace(/<p>&nbsp;<\/p>/gi, "");   //删除空行

            return content;
        });
    }

    markDiscuzImgs ($div) {
        let self = this;
        let $imgs = $div.find("img[src='static/image/common/none.gif']");

        if($imgs.length > 0) {
            for(let i = 0; i<$imgs.length; i++) {
                let zoomfile = $imgs.eq(i).attr('zoomfile');
                let url = zoomfile;
                let pos = self.imgUrlsInfos.length;

                self.imgUrlsInfos.push({pos: pos, url: url});
                cheerio(`<p>[[[img${pos}]]]</p>`).insertBefore($imgs.eq(i));
            }
            self.logger.debug(`include image amount: ${$imgs.length}`);
        }
    }

    markDirectImgs ($div) {
        let self = this;
        let $imgs = $div.find("img[onmouseover='img_onmouseoverfunc(this)'][onload='thumbImg(this)']");

        if($imgs.length > 0) {
            for(let i=0; i<$imgs.length; i++) {
                let url = $imgs.eq(i).attr('src');
                let pos = self.imgUrlsInfos.length;

                self.imgUrlsInfos.push({pos: pos, url: url});
                cheerio(`<p>[[[img${pos}]]]</p>`).insertBefore($imgs.eq(i));
            }
            self.logger.debug(`include image amount: ${$imgs.length}`);
        }
    }

    markCommonImgs ($div) {
        let self = this;
        let $imgs = $div.find("img[src^='http']");

        if($imgs.length > 0) {
            for(let i=0; i<$imgs.length; i++) {
                let url = $imgs.eq(i).attr('src');
                let pos = self.imgUrlsInfos.length;

                self.imgUrlsInfos.push({pos: pos, url: url});
                cheerio(`<p>[[[img${pos}]]]</p>`).insertBefore($imgs.eq(i));
            }
            self.logger.debug(`include image amount: ${$imgs.length}`);
        }
    }

    markAjaxImgs ($div) {
        let self = this;
        let $imgs = $div.find("img[src^='/ajax']");

        if($imgs.length > 0) {
            for(let i=0; i<$imgs.length; i++) {
                let url = self.originUrl + $imgs.eq(i).attr('src');
                let pos = self.imgUrlsInfos.length;

                self.imgUrlsInfos.push({pos: pos, url: url});
                cheerio(`<p>[[[img${pos}]]]</p>`).insertBefore($imgs.eq(i));
            }
            self.logger.debug(`include image amount: ${$imgs.length}`);
        }
    }

    markImgs ($div) {
        let self = this;
        // self.markDiscuzImgs($div);
        // self.markDirectImgs($div);
        self.markCommonImgs($div);
        self.markAjaxImgs($div);
    }

    downImgs () {
        let self = this;
        let imageInfos = [];

        return _co(function* () {
            self.logger.debug("thread uri is:", self.firstThreadUri);
            self.logger.debug("down imgs:", self.imgUrlsInfos);
            imageInfos = yield _utils.coEach({
                collection: self.imgUrlsInfos,
                limit: 6,
                func: function* (info) {
                    let url = info.url;
                    let pos = info.pos;
                    let downloadImgInfo = yield self.imgDownload({imgUrl: url});
                    return {
                        pos: pos,
                        info: downloadImgInfo
                    };
                }
            });
            return imageInfos;
        });
    }

    getPostContent (opts) {
        let self = this;
        let context = self.context;
        let $div = opts.$div;
        let divIndex = opts.divIndex;
        let threadPageNum = opts.threadPageNum;
        let pageUri = opts.pageUri;

        return _co(function* () {
            self.removeExcess($div);

            let $contentDiv = $div.find('div[class=thread_main]');
            if(!$contentDiv) {
                throw new Error("can not find $secondDiv");
            }

            let isWorkerReply = self.isWorkerReply({$div: $div});
            self.logger.debug(`isWorkerReply: ${isWorkerReply}`);

            self.markImgs($contentDiv);

            let attrs = {
                content: $contentDiv.text(),
                color: null,
                block: "[[content]]"
            };

            if(threadPageNum === 1 && divIndex === 0) {
                if(self.needReply) {
                    attrs.color = GREEN_360;
                    return yield self.quoteContentFormat(attrs);
                } else {
                    attrs.block = "[[content]]";
                    return yield self.quoteContentFormat(attrs);
                }
            } else if(isWorkerReply) {
                attrs.color = RED_COLOR;
                attrs.block = "[[content]]";
                return yield self.quoteContentFormat(attrs);
            } else {
                attrs.block = "[[content]]";
                return yield self.quoteContentFormat(attrs);
            }
        });
    }

    getThreadContent (opts) {
        let self = this;
        let context = self.context;
        let threadPageNum = self.threadPageNum;
        let needReply = opts.needReply;
        let $ = opts.page$;
        let pageUri = opts.pageUri;
        let postDivs = self.getPostDivs({$: $});

        return _co(function* () {
            self.logger.debug(`current page reply amount is: ${postDivs.length}`);
            if(!postDivs.length) {
                throw _utils.createError("Can not find post divs.");
            }

            let maxPostNum = needReply ? postDivs.length : 1;
            let divContents = [];

            for(var i=0; i<maxPostNum; i++) {
                let content = yield self.getPostContent({
                    $div: postDivs.eq(i),
                    divIndex: i,
                    threadPageNum: threadPageNum,
                    pageUri: pageUri
                });
                divContents.push(content);
            }

            return divContents;
        });
    }

    getCommonPageHtml (pageContents) {
        let self = this;
        let content = "";
        let applyAmount = 0;
        let firstContent = '';
        let replyAmountContent = '';
        let replyContent = '';

        for(let pageNum=1; pageNum<=pageContents.pageAmount; pageNum++) {
            for(let contentNum=1; contentNum<=pageContents[pageNum].length; contentNum++) {
                let pageContentIndex = contentNum - 1;
                self.logger.debug(`pageNum: ${pageNum}, pageContentIndex: ${pageContentIndex} contentNum: ${contentNum}`);
                if(pageNum === 1 && contentNum === 1) {
                    firstContent += '<p>' + pageContents[pageNum][pageContentIndex] + '</p>';
                } else if(pageNum === 1 && contentNum === 2) {
                    applyAmount += 1;
                    replyAmountContent = `<p>&nbsp;</p><p><strong>共有[[replyAmound]]个回复供您参考:</strong></p>`;
                    replyContent += `<p style='color:#999; font-size:80%;'>&nbsp;回复${applyAmount}:${pageContents[pageNum][pageContentIndex]}</p>`;
                } else {
                    applyAmount += 1;
                    replyContent += `<p style='color:#999; font-size:80%;'>&nbsp;回复${applyAmount}:${pageContents[pageNum][pageContentIndex]}</p>`;
                }
            }
        }

        return [firstContent, replyAmountContent.replace('[[replyAmound]]', applyAmount), replyContent].join('');
    }

    addTopImg (opts) {
        let self = this;
        let content = opts.content;

        if(content.indexOf('<img') === -1) {
            content = "<p>"+ self.img + "</p>" + content;
        }

        return content;
    }

    async getArticleInfo (opts) {
        let self = this;
        let context = self.context;
        let threadUri = opts.threadUri;
        let info = {
            title: "",
            content: "",
            excerpt: "",
            uri: threadUri
        };

        let $ = await self.loadUri({uri: threadUri});
        let threadTitle = self.getThreadTitle($);
        let threadPageCount = self.getThreadMaxPageCount($);
        let config = self.getConfigByThreadTitle({threadTitle: threadTitle});

        info.title = self.getThreadSubject({
            $: $,
            threadTitle: config.name
        });

        //不需要回复，则只爬第一页
        if(!config.needReply) {
            threadPageCount = 1;
        }

        let content = {
            pageAmount: threadPageCount
        };

        for(var pageNum=1; pageNum<=threadPageCount; pageNum++) {
            let pageCheerio = $;
            let pageUri;

            if(pageNum !== 1) {
                pageUri = self.getThreadPageUrl({
                    pageUrl: threadUri,
                    pageNum: pageNum
                });
                pageCheerio = await self.loadUri({uri: pageUri});
            } else {
                pageUri = threadUri;
                pageCheerio = $;
            }

            let childPageDivContents = await self.getThreadContent({
                page$: pageCheerio,
                needReply: config.needReply,
                threadPageNum: pageNum,
                pageUri: pageUri,
            });

            content[pageNum] = childPageDivContents;
        }

        info.content = self.getCommonPageHtml(content);
        info.content = self.addTopImg({content: info.content});

        //不需要恢复的话，则需要设置摘要
        // if(!config.needReply) {
            info.excerpt = self.getExcerpt(cheerio.load(info.content).text()) || null;
        // }

        return info;
    }
}

module.exports = QQ;