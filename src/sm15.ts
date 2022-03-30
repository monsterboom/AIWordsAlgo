// 难度范围
const RANGE_AF = 20
// 重复范围
const RANGE_REPETITION = 20
// 初始的间隔
const INTERVAL_BASE = 86400000
/**
 * 5:完美
 * 4:犹豫的正确
 * 3:困难回忆的正确
 * 2:容易回忆到正确答案，但答错
 * 1:想到正确答案，但答错
 * 0：完全错误
 */ 
const MAX_QUALITY = 5;
// 答对阈值
const THRESHOLD_RECALL = 3;

// 最难的AF值
const MIN_AF = 1.2
const NOTCH_AF = 0.3
const MAX_AF = MIN_AF + NOTCH_AF * (RANGE_AF - 1)

class SuperMemo {
    // 遗忘指数 SuperMemo允许遗忘指数在 3% 到 20% 的范围内
    requestedFI: number
    intervalBase: number
    queue: Array<Item>
    // 遗忘指数与成绩、OF矩阵的关系图
    fi_g: any
    // 遗忘曲线
    forgettingCurves: any

    ofm: any
    rfm: any

    constructor() {
        this.requestedFI = 10
        this.intervalBase = INTERVAL_BASE
        this.queue = []
        this.fi_g = new FI_G(this)
        this.forgettingCurves = new ForgettingCurves(this)
        this.rfm = new RFMatrix(this);
        this.ofm = new OFMatrix(this);
    }

    _findIndexToInsert = (item: Item, r?: any): number => {
        if (r == null) {
            r = __range__(0, this.queue.length, false)
        }
        if (r.length === 0) {
            return 0
        }
        const v = item.dueDate
        const i = Math.floor((r.length / 2))
        if (r.length === 1) {
            if (v < this.queue[r[i]].dueDate) {
                return r[i] 
            } else { 
                return r[i] + 1
            }
        }
        return this._findIndexToInsert(item, (v < this.queue[r[i]].dueDate ? r.slice(0, i) : r.slice(i)))
    }
        
      addItem = (value: any) => {
        const item = new Item(this, value);
        return this.queue.splice(this._findIndexToInsert(item), 0, item);
      }
    
      nextItem(isAdvanceable?: boolean, now: Date = new Date()) {
        if (0 === this.queue.length) {
            return null
        }
        if (isAdvanceable || (this.queue[0].dueDate < now)) {
            return this.queue[0]
        }
        return null
      }
    
      answer(quality: number, item: Item, now: Date = new Date()) {
        this._update(quality, item, now)
        this.discard(item)
        return this.queue.splice(this._findIndexToInsert(item), 0, item)
      }
    
      _update(quality: number, item: Item, now: Date = new Date()) {
        if (item.repetition >= 0) {
          this.forgettingCurves.registerPoint(quality, item, now)
          this.ofm.update()
          this.fi_g.update(quality, item, now)
        }
        return item.answer(quality, now)
      }
    
      discard(item: Item) {
        const index = this.queue.indexOf(item)
        if (index >= 0) {
            return this.queue.splice(index, 1)
        }
      }
    
      data() {
        return {
          requestedFI: this.requestedFI,
          intervalBase: this.intervalBase,
          queue: (Array.from(this.queue).map((item: Item) => item.data())),
          fi_g: this.fi_g.data(),
          forgettingCurves: this.forgettingCurves.data(),
          version: 1
        };
      }
}

class FI_G {
    private GRADE_OFFSET: number = 1
    private MAX_POINTS_COUNT: number = 5000

    sm: SuperMemo
    points: Array<Array<number>>
    _graph: any = null
    constructor(sm: SuperMemo) {
        this.sm = sm
        this.points = []
        // (0, 5) , (100, 0)
        for (let p of [[0, MAX_QUALITY], [100, 0]]) {
            this._registerPoint(p[0], p[1]); 
        }
    }

    _registerPoint = (fi: number, g: any) => {
        this.points.push([fi, g + this.GRADE_OFFSET]);
        this.points = this.points.slice((Math.max(0, this.points.length - this.MAX_POINTS_COUNT)));
        console.log(this.points)
        return this.points
    }

    // FI-G 图表在每次重复后通过使用预期遗忘指数和实际成绩分数进行更新
    update = (quality: number, item: Item, now: Date = new Date()) => {
        // 预期的遗忘指数
        const expectedFI = () => {
            console.log(`uF ${item.uFactor(now)}`)
            console.log(`oF ${item.oFactor}`)
            console.log(`fi ${this.sm.requestedFI}`)
            return (item.uFactor(now) / item.oFactor) * this.sm.requestedFI; 
        }
        this._registerPoint(expectedFI(), quality);
        this._graph = null
    }

    fi = (quality: number) => {
        if (this._graph == null) {
            this._graph = exponentialRegression(this.points)
        }
        return Math.max(0, Math.min(100, this._graph != null ? this._graph.x((quality + this.GRADE_OFFSET)) : undefined));
    }

    quality = (fi: number) => {
        if (this._graph == null) {
            this._graph = exponentialRegression(this.points)
        }
        return (this._graph != null ? this._graph.y(fi) : undefined) - this.GRADE_OFFSET;
    }

    data = () => {
        return {
            points: this.points
        }
    }
}

const FORGOTTEN = 1
const REMEMBERED = 100 + FORGOTTEN

class ForgettingCurves {

    private ForgettingCurve = class ForgettingCurve {
        private MAX_POINTS_COUNT = 500
        points: number[][]
        _curve: any

        constructor(points: number[][]) {
            this.points = points
        }
      
        registerPoint = (quality: number, uf: any) => {
            const isRemembered = quality >= THRESHOLD_RECALL
            this.points.push([uf, isRemembered ? REMEMBERED : FORGOTTEN])
            this.points = this.points.slice((Math.max(0, this.points.length - this.MAX_POINTS_COUNT)))
            return this._curve = null
        }

        retention = (uf: any) => {
            if (this._curve == null) { this._curve = exponentialRegression(this.points); }
            return (Math.max(FORGOTTEN, Math.min(this._curve.y(uf), REMEMBERED))) - FORGOTTEN;
        }

        uf = (retention: any) => {
            if (this._curve == null) { this._curve = exponentialRegression(this.points); }
            return Math.max(0, this._curve.x((retention + FORGOTTEN)));
        }
    }

    sm: SuperMemo
    curves: any

    constructor(sm: SuperMemo) {
        this.sm = sm
        this.curves = __range__(0, RANGE_REPETITION, false).map((r: number) => {
            const result = [];
            for (var a = 0, end = RANGE_AF, asc = 0 <= end; asc ? a < end : a > end; asc ? a++ : a--) {
              const partialPoints = ((): number[][] => {
                const p = r > 0 ?
                    (() => {
                        const result1 = [];
                        for (let i = 0; i <= 20; i++) {
                            result1.push([MIN_AF + (NOTCH_AF * i), Math.min(REMEMBERED, Math.exp((-(r+1) / 200) * (i - (a * Math.sqrt(2 / (r+1))))) * (REMEMBERED - this.sm.requestedFI))])
                        }
                        return result1
                    })()
                :
                    (() => {
                        const result2 = [];
                        for (let i = 0; i <= 20; i++) {
                            result2.push([MIN_AF + (NOTCH_AF * i), Math.min(REMEMBERED, Math.exp((-1 / (10 + (1*(a+1)))) * (i - Math.pow(a, 0.6))) * (REMEMBERED - this.sm.requestedFI))])
                        }
                        return result2
                    })()
                    return [[0, REMEMBERED]].concat(p)
                })()
                result.push(new this.ForgettingCurve(partialPoints))
            }
            return result
        })
    }

    registerPoint(quality: number, item: Item, now: Date = new Date()) {
        const afIndex = item.repetition > 0 ? item.afIndex() : item.lapse
        return this.curves[item.repetition][afIndex].registerPoint(quality, item.uFactor(now))
    }
  
    data() {
        return {
            points: __range__(0, RANGE_REPETITION, false).map((r: string | number) => 
                __range__(0, RANGE_AF, false).map((a: number) => this.curves[r][a].points)
            )
        }
    }
}

// O-Factor 矩阵
class OFMatrix {
    private INITIAL_REP_VALUE = 1;
    private afFromIndex = (a: number) => (a * NOTCH_AF) + MIN_AF
    private repFromIndex = (r: any) => r + this.INITIAL_REP_VALUE

    sm: SuperMemo
    _ofm: any
    _ofm0: any

    constructor(sm: SuperMemo) {
        this.sm = sm
        this.update()
    }

    update = () => {
        let r: number,
            a: number
        let dfs = (() => {
            let asc: boolean,
                end: number
            const result = []
            for (a = 0, end = RANGE_AF, asc = 0 <= end; asc ? a < end : a > end; asc ? a++ : a--) {
                result.push(fixedPointPowerLawRegression((() => {
                    let asc1: boolean,
                        end1: number
                    const result1 = []
                    for (r = 1, end1 = RANGE_REPETITION, asc1 = 1 <= end1; asc1 ? r < end1 : r > end1; asc1 ? r++ : r--) {
                        result1.push([this.repFromIndex(r), this.sm.rfm.rf(r, a)])
                    }
                    return result1
                })(), [this.repFromIndex(1), this.afFromIndex(a)]).b)
            }
            return result
        })()
        dfs = (() => {
            let asc2: boolean,
                end2: number
            const result2 = []
            for (a = 0, end2 = RANGE_AF, asc2 = 0 <= end2; asc2 ? a < end2 : a > end2; asc2 ? a++ : a--) {
                result2.push(this.afFromIndex(a) / Math.pow(2, dfs[a]))
            }
            return result2
        })()
        const decay = linearRegression((() => {
            let asc3: boolean,
                end3: number
            const result3 = []
            for (a = 0, end3 = RANGE_AF, asc3 = 0 <= end3; asc3 ? a < end3 : a > end3; asc3 ? a++ : a--) {
                result3.push([a, dfs[a]])
            }
            return result3
        })())
      
        this._ofm = function(a: number) {
          /*
            O-Factor = A-Factor(repetition/2)^D-Factor = (A-Factor/2^D-Factor)repetition^D-Factor
          */
          const af = this.afFromIndex(a)
          const b = Math.log(af / decay.y(a)) / Math.log(this.repFromIndex(1))
          const model = powerLawModel((af / Math.pow(this.repFromIndex(1), b)), b)
          const repFromIndex = this.repFromIndex
          const irv = this.INITIAL_REP_VALUE
          return {
            y(r: any) { return model.y(repFromIndex(r)) },
            x(y: any) { return (model.x(y)) - irv }
          }
        }
  
        const ofm0 = exponentialRegression((() => {
            let asc4: boolean,
                end4: number
            const result4 = []
            for (a = 0, end4 = RANGE_AF, asc4 = 0 <= end4; asc4 ? a < end4 : a > end4; asc4 ? a++ : a--) {
                result4.push([a, this.sm.rfm.rf(0, a)])
            }
            return result4
        })())

        this._ofm0 = (a: number) => ofm0.y(a)
    }

    of(repetition: number, afIndex: any) {
        return (repetition === 0 ? (typeof this._ofm0 === 'function' ? this._ofm0(afIndex) : undefined) : (typeof this._ofm === 'function' ? this._ofm(afIndex).y(repetition) : undefined))
    }
  
    // obtain corresponding A-Factor (column) from n (row) and value
    af(repetition: any, of_: number) {
        return this.afFromIndex(__range__(0, RANGE_AF, false).reduce((a: any, b: any) => Math.abs(this.of(repetition, a) - of_) < Math.abs(this.of(repetition, b) - of_) ? a : b))
    }
}

// R-Factor 矩阵
class RFMatrix {
    sm: SuperMemo
    constructor(sm: SuperMemo) {
      this.sm = sm
    }
      
    rf(repetition: number, afIndex: number) {
      return this.sm.forgettingCurves.curves[repetition][afIndex].uf((100 - this.sm.requestedFI))
    }
}

class Item {

    private MAX_AFS_COUNT: number = 30
    private _afs: Array<any>

    sm: SuperMemo
    value: any
    // 不达标次数：https://supermemo.guru/wiki/Lapse
    lapse: number
    // 重复次数
    repetition: number
    // 最佳因子: 连续最佳间隔的比率 类似sm2的EF https://supermemo.guru/wiki/O-Factor
    oFactor: number
    // 最佳间隔
    optimumInterval: number
    dueDate: Date
    previousDate: Date | null = null
    // A-Factor 绝对难度系数: https://supermemo.guru/wiki/A-Factor
    _aFactor: number | null = null

    constructor(sm: SuperMemo, value: any) {
        this.sm = sm
        this.value = value
        this.lapse = 0
        this.repetition = -1
        this.oFactor = 1
        this.optimumInterval = this.sm.intervalBase
        this.dueDate = new Date()
        this._afs = []
    }

    // 上一次重复间隔天数
    interval = (now: Date = new Date()): number => {
        if (this.previousDate == null) {
            return this.sm.intervalBase
        }
        return Math.round((now.getTime() - this.previousDate.getTime()))
    }

    // OFactor := OptimumInterval / UsedInterval * UFactor
    // 遗忘曲线的便捷时间度量,当前间隔与之前使用的间隔的比率: https://supermemo.guru/wiki/U-Factor
    uFactor = (now: Date = new Date()): number => {
        return this.interval(now) / (this.optimumInterval / this.oFactor)
    }
    
    aFactor = (value?: number): number => {
        if (!value) {
            return this._aFactor || 0
        }
        const a = Math.floor((value - MIN_AF) / NOTCH_AF)
        this._aFactor = Math.max(MIN_AF, Math.min(MAX_AF, MIN_AF + a * NOTCH_AF))
        return this._aFactor
    }

    afIndex = () => {
        const afs = (__range__(0, RANGE_AF, false).map((i: number) => MIN_AF + (i * NOTCH_AF)));
        return __range__(0, RANGE_AF, false)
            .reduce((a: number, b: number) => {
                return Math.abs(this.aFactor() - afs[a]) < Math.abs(this.aFactor() - afs[b]) ? a : b
            })
    }

    _Interval = (now: Date = new Date()) => {
        const of = this.sm.ofm.of(this.repetition, this.repetition === 0 ? this.lapse : this.afIndex())
        this.oFactor = Math.max(1, ((of - 1) * (this.interval(now) / this.optimumInterval)) + 1);
        this.optimumInterval = Math.round(this.optimumInterval * this.oFactor);
      
        this.previousDate = now;
        this.dueDate = new Date(now.getTime() + this.optimumInterval);
        console.log(`optimumInterval->${this.optimumInterval}`)
        return this.dueDate
    }

    _updateAFactor = (quality: number, now: Date = new Date()) => {
        // 预估的遗忘指数
        const estimatedFI = Math.max(1, this.sm.fi_g.fi(quality));
        console.log(`fig_fi => ${this.sm.fi_g.fi(quality)}`)
        console.log(`estimatedFI => ${estimatedFI}`)
        // 纠正U-Factor值
        const correctedUF = this.uFactor(now) * (this.sm.requestedFI / estimatedFI);
        console.log(`correctedUF => ${correctedUF}`)
        // 预估A-Factor值
        const estimatedAF = 
            this.repetition > 0 ?
            this.sm.ofm.af(this.repetition, correctedUF)
            :
            Math.max(MIN_AF, Math.min(MAX_AF, correctedUF));
        
        console.log(`estimatedAF => ${estimatedAF}`)
        this._afs.push(estimatedAF);
        this._afs = this._afs.slice((Math.max(0, this._afs.length - this.MAX_AFS_COUNT)));
        return this.aFactor((sum(this._afs.map((a: number, i: number) => a * (i+1))) / sum(__range__(1, this._afs.length, true))))
    }

    answer = (quality: number, now: Date = new Date()) => {
        if (this.repetition >= 0) {
            this._updateAFactor(quality, now)
        }
        if (quality >= THRESHOLD_RECALL) {
            if (this.repetition < (RANGE_REPETITION - 1)) { this.repetition++; }
            return this._Interval(now);
        } else {
            if (this.lapse < (RANGE_AF - 1)) {
              this.lapse++ 
            }
            this.optimumInterval = this.sm.intervalBase
            this.previousDate = null
            this.dueDate = now
            this.repetition = -1
            return {}
        } 
    }

    data = () => {
        return {
            value: this.value,
            repetition: this.repetition,
            lapse: this.lapse,
            oFactor: this.oFactor,
            optimumInterval: this.optimumInterval,
            dueDate: this.dueDate,
            previousDate: this.previousDate,
            _afs: this._afs
        }
    }
}

function __range__(left: number, right: number, inclusive: boolean) {
    let range = [];
    let ascending = left < right;
    let end = !inclusive ? right : ascending ? right + 1 : right - 1;
    for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
      range.push(i);
    }
    return range;
}

function sum(values: { reduce?: any; }){
    return values.reduce((a: any, b: any) => a + b);
}

function exponentialRegression(points: number[][]) {
    const n = points.length;
    const X = (() => {
        const result = [];
        for (let p of points) {       
            result.push(p[0])
        }
        return result
    })()
    const Y = (() => {
        const result1 = []
        for (let p of points) {       
            result1.push(p[1])
        }
        return result1
    })()

    const logY = Y.map(Math.log)
    const sqX = X.map((v: number) => v * v)
    
    const sumLogY = sum(logY)
    const sumSqX = sum(sqX)
    const sumX = sum(X)
    const sumXLogY = sum(__range__(0, n, false).map((i: number) => X[i] * logY[i]))
    const sqSumX = sumX * sumX
  
    const a = ((sumLogY * sumSqX) - (sumX * sumXLogY)) / ((n * sumSqX) - sqSumX)
    const b = ((n * sumXLogY) - (sumX * sumLogY)) / ((n * sumSqX) - sqSumX)
  
    const _y = (x: number) => Math.exp(a) * Math.exp(b * x)
    const _x = (y: any) => (-a + Math.log(y)) / b
    return {
        y: _y,
        x: _x,
        a: Math.exp(a),
        b,
        mse: () => mse(_y, points)
    }
}

function mse(y: (x: number) => number, points: number[][]) {
    return sum(__range__(0, points.length, false).map((i: number) => Math.pow(y(points[i][0]) - points[i][1], 2))) / points.length
}

// 幂律回归曲线
function fixedPointPowerLawRegression(points: number[][], fixedPoint: number[]) {
    /*
      given fixed point: (p, q)
      the model would be: y = q(x/p)^b
      minimize its residual: ln(y) = b * ln(x/p) + ln(q)
        y_i' = b * x_i'
          x_i' = ln(x_i/p)
          y_i' = ln(y_i) - ln(q)
    */
    const n = points.length
    const p = fixedPoint[0]
    const q = fixedPoint[1]
    const logQ = Math.log(q)
    const X = (() => {
        const result = []
        for (let point of Array.from(points)) {
            result.push(Math.log((point[0] / p)))
        }
        return result
    })()
    const Y = (() => {
        const result1 = []
        for (let point of Array.from(points)) {  
            result1.push(Math.log(point[1]) - logQ)
        }
        return result1
    })()
    const {b} = linearRegressionThroughOrigin(__range__(0, n, false).map((i: number) => [X[i], Y[i]])) 
  
    const model = powerLawModel((q / Math.pow(p, b)), b)
    return model;
};

// 幂律模型
function powerLawModel(a: number, b: number) {
    return {
        y(x: any) { return a * Math.pow(x, b) },
        x(y: number) { return Math.pow((y / a), (1 / b)) },
        a,
        b
    }
}

// 通过原点的线性回归
function linearRegressionThroughOrigin(points: number[][]) {
    const n = points.length;
    const X = (() => {
        const result = [];
        for (let p of Array.from(points)) {       
            result.push(p[0])
        }
        return result
    })()
    const Y = (() => {
      const result1 = []
      for (let p of Array.from(points)) {       
          result1.push(p[1])
      }
      return result1
    })()
  
    const sumXY = sum((__range__(0, n, false).map((i: number) => X[i] * Y[i])))
    const sumSqX = sum(X.map((v: number) => v * v))
    
    const b = sumXY / sumSqX
  
    return {
      y(x: number) { return b * x },
      x(y: number) { return y / b },
      b
    }
}

// 线性回归
function linearRegression(points: number[][]) {
    const n = points.length
    const X = (() => {
        const result = []
        for (let p of Array.from(points)) {
            result.push(p[0]);
        }
        return result;
    })()
    const Y = (() => {
        const result1 = []
        for (let p of Array.from(points)) {
            result1.push(p[1]);
        }
        return result1
    })()
    const sqX = X.map((v: number) => v * v)
  
    const sumY = sum(Y)
    const sumSqX = sum(sqX)
    const sumX = sum(X)
    const sumXY = sum((__range__(0, n, false).map((i: number) => X[i] * Y[i])))
    const sqSumX = sumX * sumX
  
    const a = ((sumY * sumSqX) - (sumX * sumXY)) / ((n * sumSqX) - sqSumX)
    const b = ((n * sumXY) - (sumX * sumY)) / ((n * sumSqX) - sqSumX)
    
    return {
      y(x: number) { return a + (b * x) },
      x(y: number) { return (y - a) / b },
      a,
      b
    }
}

export default SuperMemo