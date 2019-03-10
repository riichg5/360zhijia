# super360

此程序为 [三驴之家](https://www.360zhijia.com) 的配套爬虫程序。此程序是基于Kue基础上面实现的一套基于job挂载方式的爬虫程序。

## 压缩指定目录下面的图片

由于之前图片下载逻辑没有处理图片压缩，导致一些抓取下来的图片大小过大，影响页面加载速度并且极大浪费服务器带宽，所以在新增了抓取图片压缩存放后，增加了以下脚本处理服务器上面以前的历史图片。
脚本存放于`scripts/imageMin.js`

```bash
nohup bash -c "node scripts/imageMin.js /mnt/data/www/360zhijia/wp-content/uploads/2016 >> ~/minimage_2015.log 2>&1 &"
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
