# AIWordsAlgo

实现SuperMemo、fishing的间隔重复算法。

### SuperMemo

base文章： [https://www.supermemo.com/en/archives1990-2015/english/ol](https://www.supermemo.com/en/archives1990-2015/english/ol)


### 通用字段

| 字段名          | 类型   | 说明                                      |
| --------------- | ------ | ----------------------------------------- |
| max_quality     | init   | 最大答题质量 default: 5                   |
| threshold_recall| init   | 答对阈值 default:3                        |
| range_af        | init   | 难度范围 eg:20                            |
| interval_base   | init   | 初始间隔 ms为单位                         |
| requested_fi    | init   | 允许遗忘指数 取值范围[3, 20] eg:10        |
| max_afs_count   | init   | 难度指数数组最大长度，重复间隔次数 eg:30   |

### 建议item包含字段

| 字段名          | 类型   | 说明                                      |
| --------------- | ------ | ----------------------------------------- |
| id              | int    |                                           |
| value           | string | 单词                                      |
| notch_af        | float  | 难度指数控制，(0, 1]，值越大，越简单       |
| lapse           | init   | 不达标次数，default: 0                    |
| repetition      | init   | 重复次数，default: -1，当低于答对阈值，重置|
| o_factor        | string | 最佳因子,连续最佳间隔的比率。default: 1    |
| optimum_interval| string | 最佳间隔时间                              |
| afs             | string | 难度指数数组                              |
| due_date        | string | 下一周期时间                              |
| previous_date   | string | 上一次处理时间                            |