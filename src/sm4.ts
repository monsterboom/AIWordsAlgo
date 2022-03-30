/**
 * sm4
 * 新增了OI矩阵
 * I(n):=OI(n,EF)
 */

interface IRepeat {
    schedule: number;
    factor: number;
    isRepeatAgain: boolean;
}

const fraction: number = 0.5

/**
 * @params {number} quality 数字0~5
 * 5:完美
 * 4:犹豫的正确
 * 3:困难回忆的正确
 * 2:容易回忆到正确答案，但答错
 * 1:想到正确答案，但答错
 * 0：完全错误
 * @params {number} lastSchedule 上一次时间
 * @params {number} lastFactor 上一次时间的E-Factor(EF)
 * @params {number} interval 上一次重复的间隔
 * @return {IRepeat}
 */
export default (quality: number, lastSchedule: number = 0, lastFactor: number, interval: number): IRepeat => {
    
    let newFactor: number
    let curSchedule: number
    // 一个可配置的值，0~1取值
    
    if(quality == null || quality < 0 || quality > 5) {
        quality = 0
    }
    
    if (quality < 3) {
        newFactor = lastFactor
        curSchedule = 1 
    } else {
        switch(lastSchedule) {
            case 0:
                // I(1,EF):=OI(1,EF)=1
                curSchedule = 1
                newFactor = 2.5
                break
            case 1:
                // I(2,EF):=OI(2,EF)=6
                curSchedule = 6
                newFactor = lastFactor
                break
            default:
                newFactor = calcFactor(lastFactor, quality)
                // I(n,EF):=OI(n,EF)
                // 普通的oi矩阵算法
                curSchedule = Math.round(oiMatrix(lastSchedule + 1, newFactor))
                // 较复杂的oi矩阵算法
                // curSchedule = Math.round(elseOiMatrix(lastSchedule, newFactor, interval, quality))
                break
        }
    }
    
    return {
        schedule: curSchedule,
        factor: newFactor,
        isRepeatAgain: quality < 4
    }
}

function calcFactor(oldFactor: number, quality: number) {
    // EF':=EF+(0.1-(5-q)*(0.08+(5-q)*0.02))
    const factor = oldFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    return factor < 1.3 ? 1.3 : factor
}

function oiMatrix(schedule: number, factor: number): number {
    //OI(1,EF):=1
    //OI(2,EF):=6
    //for n>2 OI(n,EF):=OI(n-1,EF)*EF
    if (schedule === 1) {
        return 1
    } else if (schedule === 2) {
        return 6
    } else {
        return oiMatrix(schedule - 1, factor) * factor
    }
}

function elseOiMatrix(lastOi: number, factor: number, interval: number, quality: number): number {
    if (quality === 4) {
        return lastOi
    }
    // OI':=interval+interval*(1-1/EF)/2*(0.25*q-1)
    const oiAuxiliary = interval + interval * (1 - 1 / factor) / 2 * (0.25 * quality - 1) 
    // OI'':=(1-fraction)*OI+fraction*OI'
    return (1 - fraction) * lastOi + fraction * oiAuxiliary
}