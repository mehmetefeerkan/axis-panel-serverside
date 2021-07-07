var setTitle = require('console-title');
setTitle('AXIS PANEL FYAC MIDDLEWARE');
const signale = require('signale');
signale.success('INITATED FYAC MIDDLEWARE SUCCESSFULY.');
const app = require('express')(); //express, main websocket library.
const axios = require('axios'); //axios, secondary get-post library, not used right now.
const fetch = require('isomorphic-fetch'); //secondary get library, not used right now.
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest; //XHR turns out to be way better than two of the http request libraries above, since it is not a promise-based library.
const { Webhook, MessageBuilder } = require('discord-webhook-node'); //webhook lib, reserver for future use.
var request = require('request'); //request library for http redirect tracking
const fs = require('fs');
var cors = require('cors');
var jp = require('jsonpath');
const sign = "34678e41a60ea1b512b8379c5e0e37e64419ab2d4213b308bc6ff6b808f1383d2349f005f11db01aa1a94c0956ae9a45d3cd25f25d8df0eecac120bcffb882ba93ca653cfae6e1784bb12bf2534c87a6d9f722575fe535a737d135726a18b13d18bd5bc3309ad7e94bc5f2ef499ca64630c79e0a72f7b2e78cbbcf56a20087307258153cb7b07a8f36235c9adb2a1ed9c194f4f26253e16487500137d81f8bd4"


const localApi = 'http://194.31.59.244:3000/'


app.use(cors());

app.use((req, res, next) => {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    var accessedPN = req.originalUrl;
    res.setHeader('Acces-Control-Allow-Origin', '*');
    res.setHeader('Acces-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE');
    res.setHeader('Acces-Contorl-Allow-Methods', 'Content-Type', 'Authorization');
    next();
})

app.get('/fyacbanlist/:apireq/', function (req, res) { //initilize express
    apireq = req.params.apireq
    let arr = []
    arr.push(apireq)
    let apireq_ = arr.join(" ").split("*")
    console.log(apireq_.length)
    console.log(apireq_)
    if (apireq_.length <= 1 || apireq_.length === 0) {
        res.send(405)
    }
    else {
        let apikey = apireq_[0]
        let reqtype = apireq_[1]
        if (checkApiKey(apikey)) {
            if (reqtype == "read") {
                res.send(gethttp(localApi + "banlist/"))
            }
            else if (reqtype === "append") {
                let steamid = apireq_[2]
                let license_ = apireq_[3]
                if (apireq_.length === 4) {
                    if ((gethttp(`${localApi}banlist/${steamid}`) === 404)){
                        addBannedPlayer(steamid, license_)
                        res.send(200)
                    }
                    else {return res.send(500)}
                }
                else { res.send(405) }
            }
            else if (reqtype === "delete") {
                let steamid = apireq_[2]
                if (apireq_.length === 3) {
                    if ((gethttp(`${localApi}banlist/${steamid}`) != 404)){
                    axios.delete(localApi + "banlist/" + steamid)
                    console.log(steamid + " was deleted")
                    res.send(200)
                    }
                    else {res.send(404)}
                }
                else { res.send(405) }
            }
        }
        else{res.send(403)}
    }
})

app.get('/fyaccheck/:id/:license', function (req, res) { //initilize express
    id = req.params.id
    license = req.params.license
    console.log("agacım aldığım id : " + id)
    var banlistx = gethttp("http://194.31.59.244:3000/banlist")
    var hexids = (jp.query(banlistx, '$..id'));
    var licenses = (jp.query(banlistx, '$..license'));
    console.log(`${id} hexli ve ${license} lisanslı adam oyuna girmeye çalışıyor`)
    safetyResponse = 0
    let banned = false
    let hexBanned = false
    let licBanned = false
    if ( (hexids.includes(id)) ){
        banned = true
        hexBanned = true
    }
    if ((licenses.includes(license)) ){
        banned = true
        licBanned = true
    }
    var rdata = {
        banned: banned,
        hexBanned: hexBanned,
        licBanned: licBanned
    }
    res.send(rdata)
})

app.get('/fyacLicenseCheck/:lkey/', function (req, res) { //initilize express
    lkey = req.params.lkey
    let keydata = gethttp(localApi + "raiderAuth/FYACkeys").data
    let keyIsValid = false
    let yourKey = null
    let i = 0
    while (i < keydata.length){
        let currentKey = keydata[i].id
        let currentKeyData = keydata[i]
        if (currentKey === lkey){
            keyIsValid = true
            yourKey = currentKeyData
        }
        i++
    }
    if (keyIsValid){
        res.send(200, {keydata: yourKey, signature:sign})
    }
    else{
        res.send(false)
    }
})

app.listen(8415, 'localhost'); //define which ip and port for the express to listen on.


function checkApiKey(apikey) {
    let apiKeyState = gethttp(localApi + "fyacapikeys/" + apikey)
    if (!(apikey === 404)) {
        if (apiKeyState.valid) {
            return true
        }
    }
    else {
        return false
    }
}

function gethttp(url) {
    var xmlHttp = new XMLHttpRequest(); xmlHttp.open("GET", url, false); xmlHttp.send(null);
    if (xmlHttp.status == 404) {
        return 404
    }
    else {
        return JSON.parse(xmlHttp.responseText);
    }
}

function log(ldata) {
    fs.appendFile('rlogs.txt', `${new Date().toLocaleString()} | ${Date.now()} : ${ldata} \n`, function (err) { if (err) throw err; });
}


function addBannedPlayer(id, lic) {
    var patchData = {
        id: id,
        license: lic,
        liveid: null,
        xbl: null,
        xblid: null,
        discord: null,
        playerip: null,
        sourceplayername: null,
        reason: "0",
        report_id: null
        }
    axios.post('http://194.31.59.244:3000/banlist/', patchData)
}
