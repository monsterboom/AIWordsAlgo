interface IRepeat {
    schedule: number;
    factor: number;
    isRepeatAgain: boolean;
}

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
 * @return {IRepeat}
 */
export default (quality: number, lastSchedule: number = 0, lastFactor: number): IRepeat => {
    
    let newFactor: number
    let curSchedule: number
    
    if(quality == null || quality < 0 || quality > 5) {
        quality = 0
    }
    
    if (quality < 3) {
        newFactor = lastFactor
        curSchedule = 1 
    } else {
        switch(lastSchedule) {
            case 0:
                // l(1):=1
                curSchedule = 1
                newFactor = 2.5
                break
            case 1:
                // l(2):=6
                curSchedule = 6
                newFactor = lastFactor
                break
            default:
                newFactor = calcFactor(lastFactor, quality)
                // n>2: I(n):=I(n-1)*EF
                curSchedule = Math.round(lastSchedule * newFactor)
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