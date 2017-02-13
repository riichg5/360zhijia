# super360

##How to clear test data

first clear crawlers:
```
delete from crawlers where created_at >= "2017-02-01 00:00:00";
```
then flush redis
```
redis-cli
select 1
flushdb
exit
```
