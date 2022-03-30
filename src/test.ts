import SuperMemo from './sm15'

const sm = new SuperMemo()

sm.addItem('wocao')

console.log('set --> ', sm.data().queue)

let nextTime = new Date()
const answerQualitys = [3, 3, 4, 4, 4]
answerQualitys.forEach((quality:number, index: number) => {
    const myData = sm.nextItem(false, nextTime)
    if (myData) {
        sm.answer(quality, myData, nextTime)
        nextTime = new Date(myData.dueDate.getTime() + 1000)
    }
    console.log(`answer ${index+1}, quality: ${quality} --> `, sm.data().queue)
})



