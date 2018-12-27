# super360

此程序为 https://www.360zhijia.com 的配套爬虫程序。基于Kue基础上面实现的一套job挂载方式的爬虫程序。

## 清理测试数据

```
delete from crawlers where created_at >= "2017-04-25 00:00:00";
delete from wp_360_posts where post_date > "2017-04-25 00:00:00";
redis-cli
select 1
flushdb
exit
```
