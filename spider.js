/*
 * @Description: 
 * @Author: ekibun
 * @Date: 2019-11-19 16:18:44
 * @LastEditors: ekibun
 * @LastEditTime: 2019-11-19 16:21:01
 */
const bangumiData = require('bangumi-data');
const request = require('request-promise-native');
const fs = require('fs');

let fileName = `calendar.json`;

let now = new Date();
let lagDay = (a, b) => {
    return (a - b) / 1000 / 60 / 60 / 24;
}

let timezoneOffset = 60 * 8 * 60 * 1000; // UTC+8 
let parseWeekTime = (date) => {
    if (!date) return { weekDay: 0, time: '' }
    let offset = new Date(new Date(date).getTime() + timezoneOffset)
    let weekDay = offset.getUTCDay();
    let time = offset.getUTCHours().toString().padStart(2, "0") + offset.getUTCMinutes().toString().padStart(2, "0");
    return { weekDay, time }
}

let getChinaDate = (item) => {
    let chinaSites = ["acfun", "bilibili", "tucao", "sohu", "youku", "tudou", "qq", "iqiyi", "letv", "pptv", "kankan", "mgtv"]
    let date = undefined;
    for (site of item.sites) {
        if (!site.begin || !chinaSites.includes(site.site)) continue;
        date = !date && date < site.begin ? date : site.begin
    }
    return date;
}

(async () => {
    fs.writeFileSync(fileName, `[`);
    let bgmlist = bangumiData.items.filter(v => ((!v.end || lagDay(now, new Date(v.end)) < 10) && lagDay(new Date(v.begin), now) < 10));
    let first = true;
    let count = 0;
    for (bgmItem of bgmlist) {
        count++;
        let bgmId = bgmItem.sites.find(v => v.site == 'bangumi').id
        let subject = undefined;
        console.log(`${count}/${bgmlist.length}`, bgmId, bgmItem.title);
        while (!subject)
            subject = await request(`https://api.bgm.tv/subject/${bgmId}?responseGroup=large`, { json: true }).catch((error) => {
                return new Promise((resolve) => { setTimeout(resolve, 1000) });
            });
        if (!subject.eps) continue;
        let eps = [];
        subject.eps.filter(ep => ep.airdate).forEach(ep => {
            if (Math.abs(lagDay(now, new Date(ep.airdate))) < 10)
                eps.push(ep);
        })
        if (eps.length) {
            let dateJP = parseWeekTime(bgmItem.begin)
            let dateCN = parseWeekTime(getChinaDate(bgmItem))

            if (!first)
                fs.appendFileSync(fileName, `,\n`);
            first = false;
            fs.appendFileSync(fileName, JSON.stringify({
                id: subject.id,
                name: subject.name,
                name_cn: subject.name_cn,
                air_date: subject.air_date,
                weekDayJP: dateJP.weekDay,
                weekDayCN: dateCN.weekDay,
                timeJP: dateJP.time,
                timeCN: dateCN.time,
                image: subject.images && subject.images.grid,
                eps: eps.map(ep=>{
                    let {comment, desc, duration, ...nep} = ep
                    return nep
                })
            }))
        }
    }
    fs.appendFileSync(fileName, `]`);
})()
