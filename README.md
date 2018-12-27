# super360

## 清理测试数据

```
delete from crawlers where created_at >= "2017-04-25 00:00:00";
delete from wp_360_posts where post_date > "2017-04-25 00:00:00";
```

```
redis-cli
select 1
flushdb
exit
```
