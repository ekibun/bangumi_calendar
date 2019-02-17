const request = require('request-promise-native');
const git = require('simple-git')(`./`);
const fs = require('fs');

let fileName = `calendar.json`;

(async () => {
    fs.writeFileSync(fileName, `[`);
    let date = new Date();
    let weeklist = await request(`https://bgmlist.com/tempapi/bangumi/${date.getFullYear()}/${date.getMonth() + 1}/json`, { json: true });
    let first = true;
    for (id in weeklist) {
        let bgmId = weeklist[id].bgmId;
        let subject = undefined;
        console.log(bgmId);
        while (!subject)
            subject = await request(`https://api.bgm.tv/subject/${bgmId}?responseGroup=large`, { json: true }).catch((error)=>{
                return new Promise((resolve)=>{setTimeout(resolve, 1000)});
            });
        if (!subject.eps) continue;
        let eps = [];
        subject.eps.filter(ep => ep.airdate).forEach(ep => {
            let lag = (new Date(ep.airdate) - date) / 1000 / 60 / 60 / 24;
            if (Math.abs(lag) < 10)
                eps.push(ep);
        })
        if (eps.length) {
            if (!first)
                fs.appendFileSync(fileName, `,\n`);
            first = false;
            fs.appendFileSync(fileName, JSON.stringify({
                name: subject.name,
                name_cn: subject.name_cn,
                air_date: subject.air_date,
                weekDayJP: weeklist[id].weekDayJP,
                weekDayCN: weeklist[id].weekDayCN,
                timeJP: weeklist[id].timeJP,
                timeCN: weeklist[id].timeCN,
                image: subject.images.grid,
                eps: eps
            }))
        }
    }
})().then(() => {
    fs.appendFileSync(fileName, `]`);
    let time = new Date();
    git.add('./*')
        .commit('update at ' + time)
        .push(['-u', 'origin', 'master'], (e) => {
            console.log('commit 成功，时间：' + time)
        })
});