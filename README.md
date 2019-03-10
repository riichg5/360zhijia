# super360

此程序为 [三驴之家](https://www.360zhijia.com) 的配套爬虫程序。此程序是基于Kue基础上面实现的一套基于job挂载方式的爬虫程序。

## 三驴之家介绍

此网站创建于2011年，当年本人刚大学毕业不久，对网站假设比较感兴趣，之前采取人工加工文章的模式运行，但是事实证明，要收集内容，并不能依靠人工。在工业和信息如此发达的时代，必须自动化，解放劳动力才能继续发展。于2014年作者初入node后，对网络爬虫产生兴趣，萌发开发此程序的念头。经过几年的积累和沉淀，还在逐步完善此程序。此爬虫并不生搬硬套复制源站信息，它是对源站中对用户有用信息的一种提炼，最终产生的内容，是搜索引擎认为的对用户有用的信息。

## 压缩指定目录下面的图片

由于之前图片下载逻辑没有处理图片压缩，导致一些抓取下来的图片大小过大，影响页面加载速度并且极大浪费服务器带宽，所以在新增了抓取图片压缩存放后，增加了以下脚本处理服务器上面以前的历史图片。
脚本存放于`scripts/imageMin.js`


在后台运行处理脚本：
```bash
nohup bash -c "node scripts/imageMin.js /mnt/data/www/360zhijia/wp-content/uploads/2016 >> ~/minimage_2015.log 2>&1 &"
```

直接处理：
```bash
node scripts/imageMin.js 图片目录
```

## 清理测试数据

```sql
delete from crawlers where created_at >= "2017-04-25 00:00:00";
delete from wp_360_posts where post_date > "2017-04-25 00:00:00";
redis-cli
select 1
flushdb
exit
```
