/*
*   东问西问
*   http://www.jd.com/
*   http://www.myask.com.cn
*/

//根据商品类别来爬去数据
/*

比如单反相机，找到list页面第一个url:
https://list.jd.com/list.html?cat=652,654,832&page=1&sort=sort_totalsales15_desc&trans=1&JL=6_0_0#J_main

https://list.jd.com/list.html?cat=652,654,832&page={pageNum}&sort=sort_totalsales15_desc&trans=1&JL=6_0_0#J_main

找到本页里面的

然后找下一页:
<a class="pn-next" href="/list.html?cat=652,654,832&page=3&sort=sort%5Ftotalsales15%5Fdesc&trans=1&JL=6_0_0">下一页<i>></i></a>


*/

let Base = require('./Base');
let cheerio = require('cheerio');
let request = require('request-promise');
let Promise = require('bluebird');

let questionUrlTemplate = `https://question.jd.com/question/getQuestionAnswerList.action?page={pageNum}&productId={productId}`;

class JD extends Base {
	constructor(context) {
		super(context);
        this.dal = null;
	}

    begin (opts) {
        let self = this;
        let context = self.context;
        let createMsgFunc = opts.createMsgFunc;

        return _co(function* () {
            let uriRows = yield self.getJobUris();

            for(let row of uriRows) {
                let firstPageUri = self.getPageUrl({
                    originUri: row.uri,
                    pageNum: 1
                });
                let $firstPage = yield self.loadUri({uri: firstPageUri});
                let maxPageNum = self.getMaxPageCount($firstPage);
                let currentPageNum = row.page_num || 1;

                _logger.debug(`======> currentPageNum: ${currentPageNum}, maxPageNum: ${maxPageNum}`);
                //循环最大deep page
                for(; currentPageNum <= maxPageNum; currentPageNum++) {
                    let $ = null;

                    if(currentPageNum === 1) {
                        $ = $firstPage;
                    } else {
                        let uri = self.getPageUrl({
                            originUri: row.uri,
                            pageNum: currentPageNum
                        });
                        self.logger.debug(`forum page number is: ${currentPageNum}, uri is: ${uri}`);
                        $ = yield self.loadUri({uri: uri});
                    }

                    let productIds = self.getProductIds($);

                    self.logger.debug(`get productIds: ${productIds}`);
                    for(var i=0; i< productIds.length; i++) {
                        yield createMsgFunc({
                            priority: self.priority,
                            data: {
                                productId: productIds[i],
                                title: row.desc
                            }
                        });
                    }

                    row.page_num = currentPageNum + 1;
                    yield row.save();

                    //休息一下
                    // yield self.sleep(500);
                }

                row.is_over = 1;
                yield row.save();
            }

            return;
        });
    }

    getJobUris () {
        let self = this, context = self.context;

        return _co(function* () {
            let dDxTask = self.DAL.createDxTask(context);
            return yield dDxTask.findAll({
                where: {
                    is_over: 0
                }
            });
        });
    }

    getProductIds ($) {
        let linkAs = $("div[class='p-name']").find('a');
        let productIds = [];
        let amount = linkAs.length;

        for(let i=0; i<amount; i++) {
            let href = linkAs.eq(i).attr('href');
            let splits = href.split('/');
            let lastSplit = splits[splits.length - 1];
            let pageNameSplits = lastSplit.split('.');

            if(pageNameSplits.length === 2) {
                productIds.push(pageNameSplits[0]);
            }
        }
        return productIds;
    }

    getPageUrl (opts) {
        let self = this, context = self.context;
        let pageNum = opts.pageNum;
        let originUri = opts.originUri;

        return originUri.replace('{pageNum}', pageNum);
    }

    getMaxPageCount ($) {
        let self = this;
        let context = self.context;
        let pageText = $("span[class='p-skip']").find('b').text();

        if(pageText) {
            self.logger.debug(`get max pageNum text is: ${pageText}`);
            return parseInt(pageText.trim(), 10);
        } else {
            self.logger.debug(`can not get max pageNum text`);
            return 1;
        }
    }

    getPoructUrlOfJD (imgPath) {
        return `http://img1.360buyimg.com/n1/s200x200_${imgPath}`;
    }

    processQuestionsByProductId (productId) {
        let self = this, context = self.context;
        let questionList = [];
        let pageNum = 1;
        let categoryModel = null;

        return _co(function* () {
            let dProduct = self.DAL.createDxProduct(context);
            let dCategory = self.DAL.createDxCategory(context);

            do{
                let url = questionUrlTemplate.replace("{pageNum}", pageNum).replace("{productId}", productId);
                let res = yield self.loadJSON({
                    uri: url
                });

                questionList = res.questionList;
                let skuInfo = res.skuInfo;

                if(!categoryModel) {
                    categoryModel = yield dCategory.findOne({
                        where: {
                            name: skuInfo.thirdCategoryName
                        },
                        raw: true
                    });

                    if(!categoryModel) {
                        categoryModel = yield dCategory.create({
                            name: skuInfo.thirdCategoryName
                        });
                    }
                }

                if(pageNum === 1) {
                    //检查product是否存在
                    let product = yield dProduct.findOne({
                        where: {
                            id: productId
                        },
                        raw: true
                    });
                    if(!product) {
                        yield dProduct.create({
                            id: productId,
                            name: skuInfo.fullName,
                            short_name: skuInfo.shortName,
                            img_path: self.getPoructUrlOfJD(skuInfo.imgUrl),
                            category_id: categoryModel.id
                        });
                    }
                }

                if(questionList.length > 0) {
                    //插入问题
                    let asks = [];
                    let dAsk = self.DAL.createDxAsk(context);
                    let questionIds = _.map(questionList, 'id');
                    let notExistQuestionIds = [];

                    let rows = yield dAsk.findAll({
                        where: {
                            question_id: {
                                $in: questionIds
                            }
                        },
                        attributes: ['question_id'],
                        raw: true
                    });
                    let existQuestionIds = _.map(rows, 'question_id');

                    self.logger.debug(`--> existQuestionIds: ${_utils.inspect({obj: existQuestionIds})}`);
                    for(let question of questionList) {
                        //注意，目前mysql查询出来数字类型都会是字符串
                        if(existQuestionIds.indexOf(question.id + '') === -1 && question.answerCount > 0) {
                            asks.push({
                                title: question.content,
                                content: null,
                                question_id: question.id,
                                product_id: productId,
                                reply_count: question.answerCount,
                            });
                        }
                    }
                    yield dAsk.bulkCreate(asks);
                }

                pageNum ++;
            } while (questionList.length > 0);

        });
    }
}

module.exports = JD;