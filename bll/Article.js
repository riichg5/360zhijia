let Base = require('./Base');
let Promise = require('bluebird');
let moment = require('moment');
let cheerio = require('cheerio');
let fs = require('fs');

class Article extends Base {
	constructor(context) {
		super(context);
		this.dal = this.DAL.createArticle(context);

		let uriConfigs = require(_base + 'config/aidubaUris.json').concat(require(_base + 'config/bbsUris.json')).concat(require(_base + 'config/qqUris.json'));
		this.imgStrings = _.map(uriConfigs, 'img');
		this.imgStrings.push(this.BLL.createRuiXing(context).defaultImg);
		this.imgStrings.push(this.BLL.createJinShan(context).defaultImg);
		this.imgStrings = this.imgStrings.join("||||");
	}

	addOne (opts) {
		let self = this;
		let context = self.context;
		let subject = opts.subject;
		let content = opts.content;
		let excerpt = opts.excerpt;
		let tagIds = opts.tagIds;
		let uri = opts.uri;

		return _co(function *() {
			if(!tagIds || tagIds.length === 0) {
				self.logger.debug("no tag ids, can not insert to article.");
				return;
			}

			self.logger.debug("prepair db model of post.");
			let postModel = {
				post_author: 1,
				post_date: new Date(),
				post_content: content,
				post_title: _.trim(subject),
				post_status: 'publish',
				comment_status: 'open',
				ping_status: 'open',
				post_name: moment().format("YYYYMMDDhhmmss"),
				post_parent: '0',
				post_type: 'post',
				post_excerpt: excerpt,
				to_ping: '',
				pinged: '',
				post_content_filtered: '',
			};

			// let dWp360PostMeta = self.DAL.createWp360PostMeta(context);
			let dWp360TermRelationship = self.DAL.createWp360TermRelationship(context);

			let post = yield self.dal.create(postModel);
			self.logger.debug("post:", post.get({plain: true}));
			// yield dWp360PostMeta.create({
			// 	post_id: post.id,
			// 	meta_key: 'views',
			// 	meta_value: Math.round(Math.random() * 200)
			// });

			let models = [];
			_.each(tagIds, (id) => {
				models.push({
					object_id: post.id.toString(),
					term_taxonomy_id: id.toString(),
					term_order: '0'
				});
			});
			yield dWp360TermRelationship.bulkCreate(models);

			return post;
		});
	}

	getImgPath (imgUrl) {
		let splits = imgUrl.split('/');
		let isStart = false;
		let temp = [];

		for(let item of splits) {
			if(isStart) {
				temp.push(item);
				continue;
			}

			if(item === 'uploads') {
				isStart = true;
			}
		}

		return _config.get('PicPath') + '/' + temp.join('/');
	}

	async deleteIMGFromContent (opts) {
		let self = this, context = this.context;
		let content = opts.content;
		let $srcs = cheerio.load(content)("img[src*='wp-content/uploads']");

		for(let i=0; i<$srcs.length; i++) {
			let src = $srcs.eq(i).attr('src');
			if(self.imgStrings.indexOf(src) === -1) {
				//开始移除图片
				let picPath = self.getImgPath(src);
				self.logger.debug(`start remove pic: ${picPath}`);
				try {
					fs.unlinkSync(picPath);
				} catch (error) {
					self.logger.error(`fail to delete ${picPath}.`);
				}

			}
		}
	}

	async processDuplicateArticles (opts) {
		let self = this, context = this.context;
		let startDate = opts.startDate;

		let rows = await self.dal.getDuplicatePosts({
			startDate: startDate,
			limit: 100
		});

		self.logger.debug(`find duplicate article: ${rows.length}`);

		while (rows.length) {
			for(let row of rows) {
				await self.removeArticle({
					postTitle: row.post_title,
					startDate: startDate
				});
			}

			rows = await self.dal.getDuplicatePosts({
				startDate: startDate,
				limit: 50
			});
		}
	}

	async removeArticle (opts) {
		let self = this, context = this.context;
		let postTitle = opts.postTitle;
		let startDate = opts.startDate;

		let posts = await self.dal.findAll({
			where: {
				post_title: postTitle,
				post_date: {
					$gte: startDate
				}
			}
		});

		if(posts.length > 0) {
			let post = posts[0];
			post.post_title = _.trim(post.post_title);
			await post.save({fields: ['post_title']});
		}

		//只保留一个
		if(posts.length <= 1) {
			self.logger.debug(`${postTitle} only have ${posts.length} row, no need to process.`);
			return;
		}

		for(let i=1; i<posts.length; i++) {
			//首先删除图片
			let post = posts[i];
			await self.deleteIMGFromContent({content: post.post_content});

			//删除数据
			let dWp360PostMeta = self.DAL.createWp360PostMeta(context);
			let dWp360TermRelationship = self.DAL.createWp360TermRelationship(context);

			await dWp360TermRelationship.destroy({
				where: {
					object_id: post.id
				}
			});
			await dWp360PostMeta.destroy({
				where: {
					post_id: post.id
				}
			});
			await self.dal.destroy({
				where: {
					id: post.id
				}
			});
		}
	}
}

module.exports = Article;