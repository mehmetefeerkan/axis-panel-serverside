var setTitle = require('console-title');
setTitle('AXIS PANEL SERVER SCANNER');
//signed off : ephesus
const app = require('express')(); //express, main websocket library.
const axios = require('axios'); //axios, secondary get-post library, not used right now.
const fetch = require('isomorphic-fetch'); //secondary get library, not used right now.
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest; //XHR turns out to be way better than two of the http request libraries above, since it is not a promise-based library.
const { Webhook, MessageBuilder } = require('discord-webhook-node'); //webhook lib, reserver for future use.
var request = require('request'); //request library for http redirect tracking
const fs = require('fs');
var jp = require('jsonpath');
const delay = require('delay')
const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
const ayrac = (`----------------------------------------------------------------------------------`)
const apiurl = 'https://servers-live.fivem.net/api/servers/single/' //define fivem.net's api endpoint
const detailedlog = true
var cors = require('cors');
const scanInterval = 50 //ms
const signale = require('signale');
var tcpp = require('tcp-ping');

const loggingEnabled = false

const userApi = 'http://localhost:5505/'

ayraclog(`INITIALIZATION OF MAINFRAME`)

app.get('/addServer/:token/', function (req, res) { //initilize express
    svToken = req.params.token // get the value of :token/ 
    console.log(svToken)
    res.send(addServer(svToken))
    rdapsingle(svToken)
})
app.get('/add/iptt/:ipap/', function (req, res) { //initialize express
    ayraclog("/iptt/ query init.")
    let IPandPort = req.params.ipap // get the value of :token/ 
    ipToToken(IPandPort)
    ayraclog("/iptt/ query termination.")
})
app.use(cors());
app.listen(8409, '127.0.0.1'); //define which ip and port for the express to listen on.


async function mainThread(cfxtoken, csd) {
    let isOld = false
    let isError = false
    if (csd.failureCount > 50) {isOld = true}
    if (!isOld){
        const curRes = await fetch(`https://servers-live.fivem.net/api/servers/single/${cfxtoken}`).then(response => response.json()).catch(error => isError = true)
        if (!isError) {
            log(`CURRENT PROCESSED TOKEN ${cfxtoken} SHOWED NO ERRORS.`)
            let tokenEpData = curRes
            let tokenEpUsableData = tokenEpData.Data //get the { Data: } part of the enpoint response. we'll be working on that subtree from now on.
            svIPaP = tokenEpUsableData.connectEndPoints //server's ip and port. it comes in a 1.2.3.4:30120 format and we gotta split that right below and get an array of ip and port.
            let svIPaParr = svIPaP.join(" ").split(":") //splitting the returned string that's in ^ that format.
            let processedPlayerData = processPlayerData(tokenEpUsableData.players)
    
            var JSONData = { //building the JSON data body, this will be our return.
                id: cfxtoken,
                svHostName: (tokenEpUsableData.hostname.slice(0, 64)),
                svPlayerCount: tokenEpUsableData.clients,
                svResourceCount: tokenEpUsableData.resources.length,
                svLicenseType: translateLicenseType(tokenEpUsableData.vars.premium),
                svMaxPlayers: tokenEpUsableData.svMaxclients,
                svBoostPower: tokenEpUsableData.upvotePower,
                svLastSeen: tokenEpUsableData.lastSeen,
                svIPAddress: svIPaParr[0],
                svPort: svIPaParr[1],
                avgPlayerPing: processedPlayerData[0],
                droppedPlayerCount: processedPlayerData[1],
                patchTime: new Date(),
                peak: getServerPeak(tokenEpUsableData.clients, csd.peak, csd.svPlayerCount),
                rAnalysis: rAnal(tokenEpUsableData.resources),
                failureCount: 0,
                ignored: false
            }
            log(`SUCCESSFULY GOT REQUIRED DATA FOR ${cfxtoken}`)
            signale.success('Operation successful for ' + cfxtoken);
            //ignoreCurrentServer(cfxtoken, false)
            postOrPatch(JSONData)
            harr.push(JSONData)
    
        }
        if (isError) {
            log(`COULD NOT GET DATA FOR  ${cfxtoken}`)
            signale.fatal("Error recieved for " + cfxtoken);
            ignoreCurrentServer(cfxtoken, csd, true)
        }
    }
    else{
        ignoreCurrentServer(cfxtoken, csd, true)
    }
}


async function rdapsingle(cfxtoken){
    signale.pending(`Scanning initiated for ${cfxtoken}`);
    log(`CURRENT PROCESSED TOKEN  : ${cfxtoken}`)
    let isError = false
    var serverNotIgnored = true
    //var serverNotIgnored = true
    if (serverNotIgnored) {
        const curRes = await fetch(`https://servers-live.fivem.net/api/servers/single/${cfxtoken}`).then(response => response.json()).catch(error => isError = true)
        if (!isError) {
            log(`CURRENT PROCESSED TOKEN ${cfxtoken} SHOWED NO ERRORS.`)
            let tokenEpData = curRes
            let tokenEpUsableData = tokenEpData.Data //get the { Data: } part of the enpoint response. we'll be working on that subtree from now on.
            //console.log(tokenEpUsableData.resources)
            svHostName = (tokenEpUsableData.hostname.slice(0, 64));
            svPlayerCount = tokenEpUsableData.clients //define player count.
            svResourceCount = tokenEpUsableData.resources.length //define resource count by getting the lengt of the resources array.
            svLicenseType = translateLicenseType(tokenEpUsableData.vars.premium) //license type translation. we pass this to another function to able to get an understandable return
            svMaxPlayers = tokenEpUsableData.svMaxclients //define the server's maximum cleints
            svBoostPower = tokenEpUsableData.upvotePower //define the boost power of the server.
            svLastSeen = tokenEpUsableData.lastSeen //define last seen. this is useful to get if a server is under an attack since it'll delay heartbeats if so.
            svIPaP = tokenEpUsableData.connectEndPoints //server's ip and port. it comes in a 1.2.3.4:30120 format and we gotta split that right below and get an array of ip and port.
            let svIPaParr = svIPaP.join(" ").split(":") //splitting the returned string that's in ^ that format.
            svIPAddress = svIPaParr[0]; //server ip adress is the 1st member of the array, obviously.
            svPort = svIPaParr[1]; //server port is the 2nd member of the array, obviously.
            avgPlayerPing = processPlayerData(tokenEpUsableData.players)[0] //getting the average ping. we pass this to another function to handle the math and combining everything.
            droppedPlayerCount = processPlayerData(tokenEpUsableData.players)[1] //getting the average ping. we pass this to another function to handle the math and combining everything.
            rAnalysis = rAnal(tokenEpUsableData.resources);
            peak = 0
            patchTime = new Date();
    
            var JSONData = { //building the JSON data body, this will be our return.
                id: cfxtoken,
                svHostName: svHostName,
                svPlayerCount: svPlayerCount,
                svResourceCount: svResourceCount,
                svLicenseType: svLicenseType,
                svMaxPlayers: svMaxPlayers,
                svBoostPower: svBoostPower,
                svLastSeen: svLastSeen,
                svIPAddress: svIPAddress,
                svPort: svPort,
                avgPlayerPing: avgPlayerPing,
                droppedPlayerCount: droppedPlayerCount,
                patchTime: patchTime,
                peak: peak,
                rAnalysis: rAnalysis,
                ignored: false,
                failureCount: 1
            }
            log(`SUCCESSFULY GOT REQUIRED DATA FOR ${cfxtoken}`)
            signale.success('Operation successful for ' + cfxtoken);
            ignoreCurrentServer(cfxtoken, false)
            postOrPatch(JSONData)
            //console.log(cfxtoken + " is reachable.")
            //successCount = successCount + 1
    
        }
        if (isError) {
            log(`COULD NOT GET DATA FOR  ${cfxtoken}`)
            //console.log(cfxtoken + " is unreachable")
            signale.fatal("Error recieved for " + cfxtoken);
            ignoreCurrentServer(cfxtoken, true)
            //errorCount = errorCount + 1
        }
        await delay(scanInterval);
    
    }
    else {
        //console.log(cfxtoken + " is ignored")
    }
}

let harr = []


async function readDatabaseAndPatch() {
    let inittime = Date.now()
    let errorCount = 0
    let successCount = 0
    var servers = gethttp(`http://${config.databaseip}:3000/servers`)
    ayraclog(`INITIALIZATION OF MAIN RDAP`)
    let d = 1
    patchCurrentServerCount(servers.length)
    while (d < servers.length) {
        currentServerToScan = servers[d].id
        currentServerData = servers[d]
        signale.pending(`Scanning initiated for ${currentServerToScan}`);
        log(`CURRENT PROCESSED TOKEN  : ${currentServerToScan}`)
        var serverNotIgnored = true
        if (serverNotIgnored) {
            mainThread(currentServerToScan, currentServerData)
            await delay(scanInterval);
        }
        d = d + 1
    }
    axios.post(`http://194.31.59.245:4157/historic`, {
        id: ((Date.now().toString())),
        data: harr
    })

    let termtime = Date.now()
    let whileTime = termtime - inittime
    ayraclog(`TERMINATION OF MAIN RDAP`)
    console.log(`TERMINATION OF MAIN RDAP`)
    httpGetNoJSON(`${userApi}panellog/${whileTime}`)
    await delay(scanInterval * 20);
    patchCurrentFunctions(errorCount)
}




thread();
async function thread() {
    var tokensx = gethttp(`http://${config.databaseip}:3000/servers`)
    var tokens = (jp.query(tokensx, '$..id'));
    tLength = tokens.length
    let totalDelay = (tLength * scanInterval) * 2
    console.log(totalDelay * 3)
    while (true) {
        readDatabaseAndPatch();
        await delay(totalDelay * 3);
        resetArrays()
        var tokensx = gethttp(`http://${config.databaseip}:3000/servers`)
        var tokens = (jp.query(tokensx, '$..id'));
        tLength = tokens.length
        totalDelay = tLength * scanInterval
    }
}






//accessory functions V
function getServerPeak(incomingPlayerCount, currentPeak, currentPlayerCount) {
    if ((currentPlayerCount) < incomingPlayerCount) {
        return incomingPlayerCount
    }
    else {
        return currentPeak
    }

}
async function patchCurrentFunctions(errorCount) {
    let serverPage = gethttp(`http://${config.databaseip}:3000/servers`)
    let currentCur = gethttp(`http://${config.databaseip}:3000/current`).onlineplayers
    let serverCount = serverPage.length

    var playerQuery = (jp.query(serverPage, '$..svPlayerCount').toString());
    var droppedPlayerQuery = (jp.query(serverPage, '$..droppedPlayerCount').toString());
    var ignoredQuery = (jp.query(serverPage, '$..ignored').toString());

    var ignoredCount = 0
    var ignoredCount = ((ignoredQuery.toString().match(/false/g).length))

    var onlineServerCount = serverCount - ignoredCount

    var playerCountArray = playerQuery.split(',');
    var arrayOfNumbers = playerCountArray.map(Number);
    opc = arrayOfNumbers.reduce((a, b) => a + b, 0)
    if (currentCur < opc) { patchPeak(opc) }

    var droppedPlayerCountArray = droppedPlayerQuery.split(',');
    var droppedArrayOfNumbers = droppedPlayerCountArray.map(Number);
    dpc = droppedArrayOfNumbers.reduce((a, b) => a + b, 0)
    patchCurrentData(opc, dpc, onlineServerCount, ignoredCount, errorCount)

}
function translateLicenseType(keyAbbr) { //the key-abbreviaton-to-readable-full-word function lol.
    if (keyAbbr == "pt") { //if key came in "pt" return "Platinum"
        return "Platinum"
    }
    else if (keyAbbr == "ag") { //if key came in "ag" return "Argentum"
        return "Argentum"
    }
    else if (keyAbbr == "au") { //if key came in "au" return "Aurum"
        return "Aurum"
    }
    else if (keyAbbr == undefined) { //if no key came in, return "N/A"
        return "N/A"
    }
}
function rAnal(resources) {
    let c = 0
    let xadminsafe = true
    let utkarray = []
    let loafarray = []
    let m3array = []
    let orcaarray = []
    let esxarray = []
    let framework = "essentialmode"
    while (c < resources.length) {
        let currentResource = resources[c]
        if (currentResource.includes("xAdmin")) { xadminsafe = false }
        if (currentResource.includes("utk_")) { utkarray.push(1) }
        if (currentResource.includes("loaf_")) { loafarray.push(1) }
        if (currentResource.includes("m3_")) { m3array.push(1) }
        if (currentResource.includes("orca_")) { orcaarray.push(1) }
        if (currentResource.includes("esx_")) { esxarray.push(1) }
        if ((currentResource == "extendedmode") || (currentResource == "es_extended")) { framework = currentResource }
        c = c + 1
    }
    var raData = {
        xAdminSafe: xadminsafe,
        utkCount: arrTotal(utkarray),
        loafCount: arrTotal(loafarray),
        m3Count: arrTotal(m3array),
        orcaCount: arrTotal(orcaarray),
        esxCount: arrTotal(esxarray),
        framework: framework,
    }
    return raData
}
function processPlayerData(players) { //getting the average ping by summing all player pings by reading player arrays sequentially.
    let i = 0 //classic while loop integer
    let pingarray = [] //defining an empty array since we'll be putting each read pings here. we'll be summing it up with reduce soon.
    let droppedcountarray = [] //defining an empty array since we'll be putting each read pings here. we'll be summing it up with reduce soon.
    while (i < players.length) {      //classic while loop, it's fortunate we didnt have to also pass the http-got player count here, since player data comes in an
        //array format, and we can straight up get the length of the array.
        currentPlayer = players[i]
        currentPlayerPing = currentPlayer.ping //we had to redefine players[i] for some reason lol i'm really new to js.
        if (currentPlayerPing !== -1) {
            pingarray.push(currentPlayerPing) //pushing the just newly read player ping to an array.
        }
        if (currentPlayerPing == -1) {
            droppedcountarray.push(1)
        }
        i = i + 1 //classic while loop integer increment. i have to learn for loops soon.
    }
    let avgping = Math.round((pingarray.reduce((a, b) => a + b, 0)) / players.length) //"`reducing` i guess?" the array, getting the sum of pings and dividing that by the player count.
    let droppedcount = (droppedcountarray.reduce((a, b) => a + b, 0)) //"`reducing` i guess?" the array, getting the sum of pings and dividing that by the player count.
    let resultarray = [avgping, droppedcount]
    return (resultarray) //returning the average number, rounding it.
}

function resetArrays() {
    playerCountArray = [];
    plarr_upd = [];
    overallPlayerCount = 0
    plcount_upd = 0
    harr = []
}
function arrTotal(arrayx) {
    let arrayTotal = (arrayx.reduce((a, b) => a + b, 0)) //"`reducing` i guess?" the array, getting the sum of pings and dividing that by the player count.
    return arrayTotal
}

//axios functions V
function patchCurrentData(overallPlayerCount, droppedPlayerCount, onlineServerCount, ignoredCount, errorCount) {
    axios.patch(`http://${config.databaseip}:3000/current`,
        {
            onlineplayers: overallPlayerCount,
            dropped: droppedPlayerCount,
            onlineservers: onlineServerCount,
            ignored: ignoredCount,
            errorCount: errorCount

        })
    axios.patch(`http://${config.databaseip}:3000/playerepoch`,
        {
            time: Date.now(),
            pval: overallPlayerCount
        })
    axios.patch(`http://${config.databaseip}:3000/droppedepoch`,
        {
            time: Date.now(),
            pval: droppedPlayerCount
        })
}
function patchPeak(currentPeak) {
    axios.patch(`http://${config.databaseip}:3000/current`,
        {
            peak: currentPeak
        })
}
function ignoreCurrentServer(svid, csd, state) {
    var JSONData = { //building the JSON data body, this will be our return.
        id: svid,
        svPlayerCount: 0,
        avgPlayerPing: 0,
        droppedPlayerCount: 0,
        failureCount: csd.failureCount + 1,
        //failureCount: 1,
        ignored: state
    }
    axios.patch(`http://${config.databaseip}:3000/servers/` + svid, JSONData)

}
function patchCurrentServerCount(csc) {
    axios.patch(`http://${config.databaseip}:3000/current/`, //if ignore-on-demand is on, flag the server to be ignored
        {
            registered: csc
        })
}
function postOrPatch(data) {

    axios.patch(`http://${config.databaseip}:3000/servers/${data.id}`, data)
    ayraclog(`Terminating PoP FOR  ${data.id}`)

}
function addServer(token) {
    var data = {
        id: token,
        ignored: false,
    }
    signale.success(`RECIEVED ADD FOR ${token}`)
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", `http://${config.databaseip}:3000/servers/` + token, false);
    xmlHttp.send(null);
    statuscode = xmlHttp.status
    if (statuscode == 404) {
        axios({ method: 'post', url: `http://${config.databaseip}:3000/servers`, data: data })
        return 200
    }
    else { return 500 }
}



//basic xhr get functions V
function gethttp(url) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", url, false);
    xmlHttp.send(null);
    //console.log(xmlHttp.status)
    if (xmlHttp.status == 404) {
        return ["INVALID TOKEN, SERVER DOWN?", 404]
    }
    else {
        return JSON.parse(xmlHttp.responseText);
    }
}
function httpGetNoJSON(url) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", url, false);
    xmlHttp.send(null);
    //console.log(xmlHttp.status)
    if (xmlHttp.status == 404) {
        return (xmlHttp.status)
    }
    else {
        return (xmlHttp.responseText)
    }
}

// logging functions V
function log(ldata) {
    if (loggingEnabled){
        fs.appendFile('logs.txt', `${new Date().toLocaleString()} | ${Date.now()} : ${ldata} \n`, function (err) {
            if (err) throw err;
        });
    }

}
function ayraclog(type) {
    if (loggingEnabled){
        fs.appendFile('logs.txt', `${new Date().toLocaleString()} | ${Date.now()} : ${ayrac} ${type} ${ayrac} \n`, function (err) {
            if (err) throw err;
        });
    }
}



















/*const axios = require('axios')
const delay = require('delay');
const url = 'http://${config.databaseip}:3000/current';
require('fetch')
require('isomorphic-fetch');
const request = require('request');
const fs = require('fs');
var net = require('net');



const debugmode = true
const ignoreServersOnNoResponse = true

var plcount_upd = 0

var drcount = 0
var drcount_upd = 0

var plarr = [];
var plarr_upd = [];

var drarr = [];
var drarr_upd = [];


var playerCountArray = []
var droppedPlayerCountArray = []

var overallPlayerCount = 0
var overallDroppedPlayerCount = 0

const api = "http://${config.databaseip}:3000"

//datatables?
//highcharts? -> halledildi
//fontawesome on all used pages?
//adding? DONE.


const mainthread = async () => {
    logtf(`------------------------------------------------------------------------------------------------------------------`)
    logtf(` /$$$$$$ /$$   /$$ /$$$$$$ /$$$$$$$$`)
    logtf(`|_  $$_/| $$$ | $$|_  $$_/|__  $$__/`)
    logtf(`  | $$  | $$$$| $$  | $$     | $$`)
    logtf(`  | $$  | $$ $$ $$  | $$     | $$`)
    logtf(`  | $$  | $$  $$$$  | $$     | $$`)
    logtf(`  | $$  | $$\  $$$  | $$     | $$ `)
    logtf(` /$$$$$$| $$ \  $$ /$$$$$$   | $$`)

    const registeredServerCountResponse = await fetch(`${api}/current`).then(response => response.json());
    registeredServerCount = registeredServerCountResponse.registered;
    logtf(`Got current registered server count as : ${registeredServerCount}`);
    var i = 1;
    while (i < registeredServerCount) {
        logtf(`--------------------------------------------------------------------------------`)
        logtf(`Scanning server no. ${i}`);
        var currentServerRequest = await fetch(`${api}/servers/${i}`).then(response => response.json())
        logtf(`Current Queried Server ID : ${i}`)
        var csIp = currentServerRequest.ip
        var csPort = currentServerRequest.port
        var csIgnoreState = currentServerRequest.ignore
        var isError = false

        logtf(`Current Queried Server IP : ${csIp}`)
        dglog(`Current Queried Server IP : ${csIp}`)

        logtf(`Current Queried Server Port : ${csPort}`)
        logtf(`Current Queried Server Ignore State : ${csIgnoreState}`)

        if (!csIgnoreState) {
            var sock = new net.Socket();
            sock.setTimeout(2500);
            sock.on('connect', function () {
                sock.destroy();
                secondaryThread(csIp, csPort, i)

            }).on('error', function (e) {
                sock.destroy();

                console.log(csIp + ':' + csPort + ' is down: ' + e.message);
                sock.destroy();

            }).on('timeout', function (e) {
                sock.destroy();

                console.log(csIp + ':' + csPort + ' is down: timeout');
                sock.destroy();

            }).connect(csPort, csIp);


            i = i + 1

        }
        else {
            dglog("SkippingSkippingSkippingSkipping no." + i)
            //ignoreCurrentServer(i)
            i = i + 1
        }
        await delay(500);

    }
    patchCurrentDroppedCount()
    patchCurrentPlayerCount()

}
const secondaryThread = async (csIp, csPort, svid) => {
    var currentServerDynamicRequest = await fetch(`http://${csIp}:${csPort}/dynamic.json`).then(response => response.json()).catch(error => { isError = true });
    var currentServerPlayersJsonRequest = await fetch(`http://${csIp}:${csPort}/players.json`).then(response => response.json())
    logtf(`successfully requested server data.`)

    var currentServerPlayerCount = currentServerDynamicRequest.clients
    logtf(`successfully requested server player count. response is ${currentServerPlayerCount}.`)

    var playersJsonString = JSON.stringify(currentServerPlayersJsonRequest)
    var currentServerDroppedCount = (occurrences(playersJsonString, -1, true));



    playerCountArray.push(currentServerPlayerCount)
    overallPlayerCount = (playerCountArray.reduce((a, b) => a + b, 0)) //sum of the array, total plaeyr count.


    droppedPlayerCountArray.push(currentServerDroppedCount)
    overallDroppedPlayerCount = (droppedPlayerCountArray.reduce((a, b) => a + b, 0)) //sum of the array, total plaeyr count.

    patchCurrentServerPlayers(svid, currentServerPlayerCount)
    logtf(`Patched current server player count with ${currentServerPlayerCount}`)
    patchCurrentServerDropped(svid, currentServerDroppedCount)
    logtf(`Patched current server dropped count with ${currentServerDroppedCount}`)
    logtf(`--------------------------------------------------------------------------------`)


}

const getServerDataFromToken = async (client, msg, args) => {
    const ricp = await fetch(url).then(response => response.json()); //get current registered server count response
    servercount = (ricp.registered) //get current registered server count
    logtf(`Current Registered Server Count: ${servercount}`)
    dglog("REGISTERED SERVERCOUNT : " + servercount)
    i = 1 //set for int
    while (i < servercount) {
        logtf(`SERVERSCAN : NO ${i}`)
        var cservers = await fetch('http://${config.databaseip}:3000/servers/' + i) //fetch server no.i
            .then(
                response => response.json() //bind response with json parsing
            )
        var csIp = cservers.ip //bind ip var
        var csPort = cservers.port //bind port var
        var isError = false //error variable
        var isIgnored = cservers.ignore
        logtf(`Current Server: ${csIp}`)
        if (!isIgnored) {
            logtf(`Current Server NOT IGNORED.`)
            dglog(`accessing http://${csIp}:${csPort}/dynamic.json`) //log which url was accessed
            logtf(`Accessed http://${csIp}:${csPort}/dynamic.json`)

            var cserver = await fetch(`http://${csIp}:${csPort}/dynamic.json`).then(response => response.json()).catch(error => { //fetch current server's dynamic.json
                isError = true //if a timeout is reached, or if there is any error, set isError to true so we can prevent querying below
                dglog(error); //log the error
            });
            var droppedfetch = await fetch(`http://${csIp}:${csPort}/players.json`).then(response => response.json()).catch(error => { //fetch current server's dynamic.json
                isError = true //if a timeout is reached, or if there is any error, set isError to true so we can prevent querying below
                dglog(error); //log the error

            });
            if (!isError) {
                logtf(`Current Server IS IGNORED.`)

                var droppedstring = JSON.stringify(droppedfetch)
                var droppedcount = (occurrences(droppedstring, -1, true));

                logtf(`Current Server Drop Count: ${droppedcount}`)

                var thisclients = cserver.clients //bind client int
                dglog(cserver.clients) //log client integer

                plarr_upd.push(cserver.clients); //push player count to the array
                dglog(plarr_upd) //log the current array
                plcount_upd = (plarr_upd.reduce((a, b) => a + b, 0)) //sum of the array, total plaeyr count.


                drarr_upd.push(droppedcount); //push player count to the array
                dglog(drarr_upd) //log the current array
                drcount_upd = (drarr_upd.reduce((a, b) => a + b, 0)) //sum of the array, total plaeyr count.

                patchCurrentServerPlayers(i, thisclients) //patch current server's player count with the one that's returned by the dynamic.json
                patchCurrentServerDropped(i, droppedcount)
                //ignoreCurrentServer(i, false); //ignoring server if there is not an error


                //logging end
                logtf(`----------------------------------------------------------------------------------`)
            }

            else {
                ignoreCurrentServer(i, true); //ignoring server if there is an error
                dglog("IGNORING SERVER NO." + i) //logging ^ that
                await delay(3000)
                patchCurrentServerPlayers(i, 0);
            }
            i = i + 1
        }
        else {
            dglog("SkippingSkippingSkippingSkipping no." + i)
            //ignoreCurrentServer(i)
        }
        i = i + 1

    }
    dglog("grand total : " + plcount_upd) //logging current total
    await delay(3000)

    patchCurrentPlayerCount();
    patchCurrentDroppedCount();
}

function occurrences(string, subString, allowOverlapping) {

    string += "";
    subString += "";
    if (subString.length <= 0) return (string.length + 1);

    var n = 0,
        pos = 0,
        step = allowOverlapping ? 1 : subString.length;

    while (true) {
        pos = string.indexOf(subString, pos);
        if (pos >= 0) {
            ++n;
            pos += step;
        } else break;
    }
    return n;
}

//getRegisteredServers();
thread();
async function thread() {
    while (true) {
        mainthread();
        playerCountArray = [];
        plarr_upd = [];
        overallPlayerCount = 0
        plcount_upd = 0
        await delay(120000);
    }
}

function dglog(lval) {
    if (debugmode) {
        console.log(lval)
    }
}

function patchCurrentServerPlayers(svid, plc) {
    axios.patch('http://${config.databaseip}:3000/servers/' + svid, //patching the current server's playercount
        {
            players: plc //patch specification
        })
    logtf(`Patched server no. ${svid} with player count ${plc}`)
}

function patchCurrentServerDropped(svid, drc) {
    axios.patch('http://${config.databaseip}:3000/servers/' + svid, //patching the current server's playercount
        {
            droppped: drc //patch specification
        })
    logtf(`Patched server no. ${svid} with drop count ${drc}`)

}

function ignoreCurrentServer(svid) {
    if (ignoreServersOnNoResponse) {
        axios.patch('http://${config.databaseip}:3000/servers/' + svid, //if ignore-on-demand is on, flag the server to be ignored
            {
                ignore: true
            })
    }
}

function patchCurrentDroppedCount() {
    axios.patch('http://${config.databaseip}:3000/current',
        {
            dropped: overallDroppedPlayerCount
        })
    axios.patch('http://${config.databaseip}:3000/droppedepoch',
        {
            time: Date.now(),
            pval: overallDroppedPlayerCount
        })
}

function patchCurrentPlayerCount() {
    axios.patch('http://${config.databaseip}:3000/current',
        {
            onlineplayers: overallPlayerCount
        })
    axios.patch('http://${config.databaseip}:3000/playerepoch',
        {
            time: Date.now(),
            pval: overallPlayerCount
        })
}

function gettimedatatest() {
    axios.patch('http://${config.databaseip}:3000/servers/' + svid, //patching the current server's playercount
        {
            players: plc //patch specification
        })
}

function logtf(ldata) {
    fs.appendFile('logs.txt', `${Date.now()} : ${ldata} \n`, function (err) {
        if (err) throw err;
    });
}
*/


