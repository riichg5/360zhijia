let DAL = require('../dal');
let BLL = require('./index');
let request = require('request-promise');
let cheerio = require('cheerio');
let moment = require('moment');
let path = require('path');
let uuid = require('uuid');
let fs = require('fs');
let url = require('url');
let mkdirp = require('mkdirp');
let Promise = require('bluebird');
let sizeOf = Promise.promisify(require('image-size'));
const md5File = require('md5-file/promise');
const fileType = require('file-type');
const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const imageminOptipng = require('imagemin-optipng');
const imageminGifsicle = require('imagemin-gifsicle');
const imageminWebp = require('imagemin-webp');

let iconv = require('iconv-lite');

class Base {
	constructor(context) {
		this.context = context;
		this.logger = context ? context.logger : {};
		this.DAL = DAL;
		this.BLL = BLL;
	}

	getById(id) {
		return this.dal.getById(id);
	}

	queryOneById(id) {
		return this.dal.queryOneById(id);
	}

	beginTran (func) {
		return this.context.sequelize.transaction(() => {
			return func();
		});
	}

	sleep (time) {
		return _co(function* () {
		    yield new Promise((done, reject) => {
		        setTimeout(done, time);
		    });
		});
	}

	loadUri (opts) {
		let self = this;
		let context = self.context;
		let uri = opts.uri;
		let charset = opts.charset;
		let isJsonResponse = opts.isJsonResponse;
        let requestOpt = {};

        if(charset) {
			requestOpt = {
	            uri: uri,
	            transform: function (body) {
	            	body = iconv.decode(body, charset);
	                return cheerio.load(body);
	            }
	        };
	        requestOpt.encoding = null;
        } else {
			requestOpt = {
	            uri: uri,
	            transform: function (body) {
	            	// console.log(`----> body: ${body}`);
	                return cheerio.load(body);
	            }
	        };
        }

        return _co(function* () {
        	self.logger.debug("start request requestOpt: ", JSON.stringify(requestOpt));
        	let $ = yield request(requestOpt);
        	return $;
        });
	}

	getPCRequestHeaders () {
		return {
			"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
			"Accept-Encoding": "gzip, deflate, br",
			"Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7,de;q=0.6",
			"Cache-Control": "no-cache",
			"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36"
		};
	}

	loadJSON (opts) {
		let self = this;
		let context = self.context;
		let uri = opts.uri;
		let charset = opts.charset;
        let requestOpt = {};

        if(charset) {
			requestOpt = {
	            uri: uri,
	            headers: self.getPCRequestHeaders(),
	            transform: function (body) {
	            	body = iconv.decode(body, charset);
	                return body;
	            },
	            json: true
	        };
	        requestOpt.encoding = null;
        } else {
			requestOpt = {
	            uri: uri,
	            headers: self.getPCRequestHeaders(),
	            transform: function (body) {
	                return body;
	            },
	            json: true
	        };
        }

        return _co(function* () {
        	self.logger.debug("start request requestOpt: ", JSON.stringify(requestOpt));
        	let res = yield request(requestOpt);
        	return res;
        });
	}

    addDefaultImg (html) {
        let self = this;

        if(html.indexOf('<img') === -1) {
            return "<p>" + self.defaultImg + "</p>" + html;
        }

        return html;
    }

	getImgSize (imgInfo) {
	    //计算长宽比例
	    let maxImgWidth = _config.get("maxImgWidth");
	    let scale = imgInfo.height / imgInfo.width;
	    if(scale > 1.4){
	     	maxImgWidth = parseInt(maxImgWidth / 2, 10);
	    }
	    if(imgInfo.width >= maxImgWidth){
	    	let percentVal = maxImgWidth / imgInfo.width;
	    	imgInfo.width = parseInt(maxImgWidth, 10);
	    	imgInfo.height = parseInt(imgInfo.height * percentVal, 10);
	    }

	    return imgInfo;
	}

  	replacePhoneNumber (content) {
	    // content = content.replace(/1(\d{2})\d{4}(\d{4})/g, "1$1****$2");
	    return content;
  	}

  	replaceWords (content) {
	    CONST.WORDS.forEach(word => {
			content = content.replace(new RegExp(word, "gi"), "**", "gi");
	    });

	    return content;
  	}

	getImageFolderName () {
		let self = this;
		let dateStr = moment().format('YYYY/MM');
		let fullPath = path.resolve(_config.get("PicPath"), dateStr);
		let webPath = path.join(_config.get('imgWebPath'), dateStr);

		let info = {
			fullPath: fullPath,
			webPath: webPath
		};

		self.logger.debug("info:", info);
		return info;
	}

	getImgExt (imgUrl) {
		//腾讯图片有些http://shp.qpic.cn/txdiscuz_pic/0/_bbs_guanjia_qq_com_forum_201704_24_111343ppfpp0pfhror2rvf.png/0格式
		if(_.endsWith(imgUrl, "/0")) {
			let len = imgUrl.length;
			return path.parse(imgUrl.substring(0, len-2)).ext;
		} else {
			return path.parse(imgUrl).ext;
		}
	}

	async imgDownload (opts) {
		let self = this;
		let imgUrl = opts.imgUrl.trim();
		let imgInfo = self.getImageFolderName();
		let ext = self.getImgExt(imgUrl); //path.parse(imgUrl).ext;
		let uuidVal = uuid.v4();
		let imageName = "";
		let imagePath = "";

		let pMkdirp = Promise.promisify(mkdirp).bind(mkdirp);
		await pMkdirp(imgInfo.fullPath);

		let isErrored = false;

		try {
			let res = await request.get({
				uri: imgUrl,
				timeout: 10 * 1000,
				encoding: null,
				headers: self.getPCRequestHeaders()
			});

		    // const buffer = Buffer.from(res, 'utf8');
		    let buffer = Buffer.from(res);
		    let bufferSizeBeforeMinify = buffer.length;
		    let bufferSizeAfterMinify = buffer.length;

		    if(!ext) {
		    	let imageTypeInfo = fileType(Buffer.from(buffer, 0, fileType.minimumBytes));
		    	ext = "." + imageTypeInfo.ext;
		    }

		    imageName = path.join(imgInfo.webPath, uuidVal + ext);
		    imagePath = path.join(imgInfo.fullPath, uuidVal + ext);

			self.logger.debug(`
				start get imgUrl: ${imgUrl},
				will be save to: ${imagePath},
				ext: ${ext}
			`);

			//minify image
			buffer = await imagemin.buffer(buffer, {
				plugins: [
	            	imageminMozjpeg({
	            		quality: 45
	            	}),
	            	imageminPngquant({
	            		quality: [0.3, 0.4]
	            	}),
	            	imageminGifsicle({
	            		optimizationLevel: 2,
	            		colors: 128
	            	}),
	            	// imageminWebp({  一定记住，这里imageminWebp不能和上面的一起用，因为imageminWebp里面会处理gif png jpg这些..导致图片损坏
	            	// 	quality: 45
	            	// })
	        	]
	       	});

	       	bufferSizeAfterMinify = buffer.length;

	       	self.logger.debug(`
	       		imagePath: ${imagePath},
	       		bufferSizeBeforeMinify: ${bufferSizeBeforeMinify},
	       		bufferSizeAfterMinify: ${bufferSizeAfterMinify}
	       	`);

		    fs.writeFileSync(imagePath, buffer);
		} catch (error) {
			self.logger.warn(`download img error, error: ${error.message}, stack: ${error.stack}`);
			isErrored = true;
		}

		if(isErrored) {
			//返回默认的no-photo图片
			return {
				imagePath: `/mnt/data/www/360zhijia/wp-content/uploads/site/no-photo.jpg`,
				imagWebPath: `/wp-content/uploads/site/no-photo.jpg`,
				width: 250,
				height: 250
			};
		}

		self.logger.debug("saved....");
		let info = {
			width: 600,
			height: 600
		};

		//获取hash值
		let md5 = await md5File(imagePath);
		md5 = md5.toLowerCase();
		let newImagePath = path.join(imgInfo.fullPath, md5 + ext);
		let newImageName = path.join(imgInfo.webPath, md5 + ext);

		fs.renameSync(imagePath, newImagePath);
		self.logger.debug(`imagePath----> ${imagePath}, newImagePath(md5)----> ${newImagePath}`);

		try {
			info = await sizeOf(newImagePath);
		} catch(error) {
			self.logger.debug(`size of ${newImagePath} error: ${error.message}`);
		}

		self.logger.debug(`image info: width:${info.width}, height:${info.height}`);
		let res = {
			imagePath: newImagePath,
			imagWebPath: newImageName,
			width: info.width,
			height: info.height
		};

		self.logger.debug("imgDownload returned:", res);
		return res;
	}

	isWeiXinUri (uri) {
		return uri.indexOf('://mp.weixin.qq.com') !== -1;
	}

	getImgSrc (opts) {
		let self = this;
		let context = self.context;
		let uri = opts.uri;
		let $img = opts.$img;
		let src;

		if(self.isWeiXinUri(uri)) {
			src = $img.attr('data-src');
		} else {
			src = $img.attr('src');
		}

		if(src.indexOf('http://') === -1 || src.indexOf('https://') === -1) {
			src = url.resolve(uri, encodeURI(src));
		}

		return src;
	}

	//处理文章中的图片
	procContentImgs (opts) {
		let self = this;
		let context = self.context;
		let $ = opts.$html;
		let uri = opts.uri || self.uri;
		let imgArray = [];
		let images = $.find('img');
		let firstImgUrl = null;
		let maxImgWidth = _config.get("maxImgWidth");

		for(let i = 0; i < images.length; i++) {
			//base64图片不用下载
			// console.log(`images.eq(i).attr('src'): ${images.eq(i).attr('src')}`);
			// console.log(`images.eq(i): ${images.eq(i).html()}`);

			// if(images.eq(i).attr('src') && images.eq(i).attr('src').indexOf('base64,') === -1) {
			// 	imgArray.push(images.eq(i));
			// }
			imgArray.push(images.eq(i));
		}

		// self.logger.debug("images:", imgArray);
		return Promise.each(imgArray, ($img, index, length) => {
			let src = self.getImgSrc({uri: uri, $img: $img});

			return self.imgDownload({imgUrl: src}).then(res => {
				let imagWebPath = res.imagWebPath;
				let width = res.width;
				let height = res.height;

				self.logger.debug("procContentImgs filename:", imagWebPath);
				let name = imagWebPath.substring(imagWebPath.lastIndexOf('/') + 1);
				//如果图片下载成功
				if(imagWebPath) {
					$img.attr('src', imagWebPath);
					$img.attr('title', name);
					$img.attr('alt', name);

					if(width > maxImgWidth) {
						$img.removeAttr('height');
						$img.attr("width", `${maxImgWidth}px`);
					}

					$img.wrap(cheerio('<center></center>'));
					if(!firstImgUrl) {
						firstImgUrl = imagWebPath;
					}
				} else {
					$img.remove();
				}

				return;
			});
		}).then(() => {
			return {
				firstImgUrl: firstImgUrl,
				html: $.html()
			};
		});
	}

	//判断是否有pre标签，添加SyntaxHighlighter
	addSyntaxHighlighter (opts) {
		let self = this;
		let context = self.context;
		let $content = opts.$content;

		if($content.has("pre[class='pure-highlightjs']")) {
			let config = _config.get("highlightjs");
			self.logger.debug("find pure-highlightjs pre tag.");
			$content.append(`<link href="${config.css}" rel="stylesheet">`);
			$content.append(`<script type="text/javascript" src="${config.js}"></script>`);
			$content.append(`<script>hljs.initHighlightingOnLoad();</script>`);
			self.logger.debug("add css and js of highlightjs");
			return;
		}

		if($content.has("pre")) {
			let config = _config.get("syntaxHighlighter");
			self.logger.debug("find syntaxHighlighter pre tag.");
			$content.append(`<link type="text/css" media="all" href="${config.css}" rel="stylesheet">`);
			$content.append(`<script type="text/javascript" src="${config.js}"></script>`);
			$content.append(`<script type="text/javascript">SyntaxHighlighter.all();</script>`);
			self.logger.debug("add css and js of syntaxHighlighter");
		}
	}

	//Base统一处理content的方法
	baseHtmlProcess (opts) {
		let self = this;
		let context = self.context;
		let $content = opts.$content;
		let uri = opts.uri;

		return _co(function* () {
			self.addSyntaxHighlighter({$content: $content});
			self.convertWeiXinFrameVideo({
				$content: $content,
				uri: uri
			});
			yield _resolve();
			return;
		});
	}

	removeEmptyStr (text) {
    	text = text.replace(/\r/gi, "");
    	text = text.replace(/\n/gi, "");
    	text = text.replace(/(&nbsp;)/gi, "");
    	text = text.replace(/\s/gi, "");
    	text = text.replace(/<br\/>/gi, "");
    	text = text.replace(/<br>/gi, "");
    	text = text.replace(/<p>/gi, "");
    	text = text.replace(/<p\/>/gi, "");
		return text;
	}

    //将文本里面的url链接转换为html a标签
    convertTextToLink (text) {
        text.replace(
            /((http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?)/gi,
            "<a href='$1' target='_blank'>$1</a>"
        );
        return text;
    }

    convertHtmlDecode (html) {
    	return html.replace(/(&#)\S{5};/gi, str => {
    		return cheerio.load(`<p>${str}</p>`).text();
    	});
    }

    convertWeiXinFrameVideo (opts) {
    	let self = this;
    	let context = self.context;
    	let $content = opts.$content;
    	let uri = opts.uri;

    	if(!self.isWeiXinUri(uri)) {
    		return;
    	}

    	let videoFrames = $content.find("iframe.video_iframe");
    	for(let i = 0; i < videoFrames.length; i++) {
    		let $frame = videoFrames.eq(i);
    		let flashFrameUri = $frame.attr('data-src');
    		$frame.attr("src", flashFrameUri);
    //
    // 		let $flash = cheerio(`
    // 			<div>
				// 	<embed
				// 	src="${flashUri}"
				// 	width="670px"
				// 	height="502px"
				// 	align="middle">
				// </div>
    // 		`);

    // 		self.logger.debug("------------------>", $flash.html());
    // 		$frame.replaceWith($flash);
    	}
    }

	filterHtml (html) {
		let self = this;

		html = self.convertHtmlDecode(html);
        html = self.replacePhoneNumber(html);
        html = self.replaceWords(html);
        html = self.convertTextToLink(html);

        return html;
	}

	getExcerpt (text) {
		let len = _config.get("excerptLength") - 5;
		let maxLen = len + 20;
		let textLen = text.length;
		let pureStr = this.removeEmptyStr(text);
		let str = pureStr.substring(0, len);
		let flags = ['。','.','!','?','..',';','，',',',':'];

		// for(let i = len; i < maxLen && i < textLen; i++) {
		// 	if(overFlag.indexOf(str[str.length - 1]) !== -1) {
		// 		break;
		// 	}

		// 	str += text[i];
		// }

		if(flags.indexOf(str[str.length - 1]) !== -1) {
			return str;
		}

		return str + '...';
	}

	getPageUri (opts) {
		let siteUrl = _config.get("siteUrl");
		let categoryName = opts.categoryName;
		let postId = opts.postId;

		return `${siteUrl}${categoryName}/${postId}.html`;
	}

	getProxyServersPageUrls (opts) {
		let categoryName = opts.categoryName;
		let postId = opts.postId;

		return [
			`http://45.192.167.10:3002/${categoryName}/${postId}.html`,
			`http://45.192.160.159:3002/${categoryName}/${postId}.html`,
			`http://154.223.141.247:3002/${categoryName}/${postId}.html`,
		];
	}

	getBaiduMipPageUri (opts) {
		let siteUrl = _config.get("mobileSiteUrl");
		let categoryName = opts.categoryName;
		let postId = opts.postId;

		return `${siteUrl}${categoryName}/${postId}.html`;
	}

	requestPageUrl (opts) {
		let self = this;
		let context = self.context;
		let url = opts.url;
		let needRequestPageUrl = _config.get('needRequestPageUrl');

		return _co(function* () {
			if(!needRequestPageUrl) {
				return;
			}

			let startTime = new Date();
			yield request(url).then(function (htmlString) {
				let endTime = new Date();
				let usedTime = endTime - startTime;
				self.logger.debug(`request pc ${url} success, used time: ${usedTime}`);
		    }).then(() => {
		    	startTime = new Date();
		    	return request({
		    		method: 'GET',
		    		uri: url,
		    		headers: {
		    			"User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Mobile Safari/537.36",
		    		}
		    	}).then(htmlString => {
					let endTime = new Date();
					let usedTime = endTime - startTime;
					self.logger.debug(`request mobile ${url} success, used time: ${usedTime}`);
		    	});
		    }).catch(function (error) {
				let endTime = new Date();
				let usedTime = endTime - startTime;
		    	self.logger.debug(`request ${url} failed, used time: ${usedTime}, error: ${error.message}`);
		    });
		});
	}

	pushUri (opts) {
		let self = this;
		let context = self.context;
		let postId = opts.postId;

		return _co(function* () {
	        //push

            if(process.env.NODE_ENV !== 'production') {
                self.logger.debug("not production NODE_ENV, no need push url.");
                return;
            }

	        let bPush = self.BLL.createPush(context);
	        let dWp360Term = self.DAL.createWp360Term(context);
	        let categoryName = yield dWp360Term.getCategoryName(self.categoryId);

	        if(!categoryName) {
	            return yield _reject("can not get category.");
	        }
	        let pageUrl = self.getPageUri({postId: postId, categoryName: categoryName});
	        // let baiduMipPageUrl = self.getBaiduMipPageUri({postId: postId, categoryName: categoryName});
	        let proxyServersPageUrls = self.getProxyServersPageUrls({postId: postId, categoryName: categoryName});

	        yield [
	        	self.requestPageUrl({url: proxyServersPageUrls[0]}),
	        	self.requestPageUrl({url: proxyServersPageUrls[1]}),
	        	self.requestPageUrl({url: proxyServersPageUrls[2]}),
	        	bPush.pushToAll({uri: pageUrl}),
	        ];
		});
	}
}

module.exports = Base;