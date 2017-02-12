# super360
## 清除测试数据

first clear crawlers:
```
delete from crawlers where created_at >= "2017-01-01 00:00:00";
```
then flush redis
```
redis-cli
flushdb
exit
```
