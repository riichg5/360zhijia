let Base = require('./Base');
let Promise = require('bluebird');
let moment = require('moment');

class Article extends Base {
	constructor(context) {
		super(context);
		this.dal = this.DAL.createArticle(context);
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
				post_title: subject,
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

			let dWp360PostMeta = self.DAL.createWp360PostMeta(context);
			let dWp360TermRelationship = self.DAL.createWp360TermRelationship(context);

			let post = yield self.dal.create(postModel);
			self.logger.debug("post:", post.get({plain: true}));
			yield dWp360PostMeta.create({
				post_id: post.id,
				meta_key: 'views',
				meta_value: Math.round(Math.random() * 200)
			});

			let models = [];
			_.each(tagIds, (id) => {
				models.push({
					object_id: post.id.toString(),
					term_taxonomy_id: id.toString(),
					term_order: '0'
				});
			});
			yield dWp360TermRelationship.bulkCreate(models);
			return;
		});
	}
}

module.exports = Article;