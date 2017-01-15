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
let imageInfo = require('image-info');

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

	loadUri (opts) {
		let self = this;
		let context = self.context;
		let uri = opts.uri;
        let requestOpt = {
            uri: uri,
            transform: function (body) {
                return cheerio.load(body);
            }
        };

        return _co(function *() {
        	self.logger.debug("start request requestOpt.uri:", requestOpt.uri);
        	let $ = yield request(requestOpt);
        	return $;
        });
	}

	getImageFolderName () {
		let self = this;
		let dateStr = moment().format('YYYY/MM/DD');
		let fullPath = path.resolve(_config.get("PicPath"), dateStr);
		let webPath = path.join(_config.get('imgWebPath'), dateStr);

		let info = {
			fullPath: fullPath,
			webPath: webPath
		};

		self.logger.debug("info:", info);
		return info;
	}

	imgDownload (opts) {
		let self = this;
		let imgUrl = opts.imgUrl;
		let imgInfo = self.getImageFolderName();
		let ext = path.parse(imgUrl).ext;
		let imageName = path.join(imgInfo.webPath, uuid.v4() + ext);
		let imagePath = path.join(imgInfo.fullPath, uuid.v4() + ext);

		self.logger.debug("start get imgUrl:", imgUrl);
		self.logger.debug("will be save to", imagePath);

		return _co(function *() {
			let pMkdirp = Promise.promisify(mkdirp).bind(mkdirp);
			yield pMkdirp(imgInfo.fullPath);

			let picStream = fs.createWriteStream(imagePath);
			let pOn = Promise.promisify(picStream.on).bind(picStream);

			let requestInfo = request.get({
				url: imgUrl,
				timeout: 99999
			}).pipe(picStream);

			yield pOn('close');
			self.logger.debug("saved....");
			let pImageInfo = Promise.promisify(imageInfo);
			let info = yield pImageInfo(imagePath);
			let res = {
				imagePath: imagePath,
				imagWebPath: imageName,
				width: info.width,
				height: info.height
			};

			self.logger.debug("imgDownload returned:", res);
			return res;
		});
	}

	//处理文章中的图片
	procContentImgs (opts) {
		let self = this;
		let context = self.context;
		let $ = opts.$html;
		let imgArray = [];
		let images = $.find('img');
		let firstImgUrl = null;
		let maxImgWidth = _config.get("maxImgWidth");

		for(let i = 0; i < images.length; i++) {
			imgArray.push(images.eq(i));
		}

		// self.logger.debug("images:", imgArray);
		return Promise.each(imgArray, ($img, index, length) => {
			let src = $img.attr('src');

			if(src.indexOf('http://') === -1) {
				src = url.resolve(self.uri, encodeURI(src));
			}

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

					if(width > maxImgWidth) {
						$img.removeAttr('height');
						$img.attr("width", `${maxImgWidth}px`);
					}

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
}

module.exports = Base;