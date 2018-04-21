"use strict";
const webdriver = require("selenium-webdriver");
const argv      = require('minimist')(process.argv.slice(2));

const fs = require('fs');

const profile = argv.profile;

const arr = profile.split(new RegExp('\\\\|\\/', 'g'));
const accName = arr[arr.length - 1];

exports.accName = accName;
exports.dbname  = `${accName}.sqlite3`;
exports.profile = profile;
exports.count = parseInt(argv.count || 0);
exports.social = argv.social || 'instagram';

const logFile = fs.createWriteStream(`${__dirname}/logs/${accName}.log`, {flags : 'w'});

exports.PAUSE = {
    AFTER_TASK_CLICK: 1000,
    AFTER_FALSE_TASK: 1000,
    AFTER_JOIN_CLICK: 2000,
    AFTER_TASK_COMPLETE: 5000,
    BEFORE_UNSUBSCRIBE: 3000,
    MAXWAIT_FOR_PROTECT: 100000,
    WAIT_FOR_LOGIN: 100000,
    NO_TASKS:60000,
    RECONNECTING: 10000
};

exports.chrome_options = {
    "binaryPath": "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "profile": "C:/tmp/chrome"
};

exports.sleep = function (par) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(par), par);
    });
}

let stopWords = [
    'гель', 'sex', 'porn', 'порн', 'секс'
];
exports.stopWords = stopWords;
    
exports.isBlocked = function(text) {
    for (let word of stopWords) {
        if (text.toLowerCase().search(word) !== -1)
            return true;
    }
    return false;
}

exports.log = function(...data) {

    let str = data.join(' ');
    logFile.write(str.replace("\x1b[33m", "").replace("\x1b[35m", "").replace("\x1b[39m", "") + '\n');
    console.log(str);

}

exports.error = function(e, message) {

    if (message) {
        console.log(message);
        logFile.write(message + '\n');
    }    

    console.log("\x1b[35m" + e.message + "\x1b[39m");
    logFile.write(e.message + '\n');
    
}

exports.waitFor = async function (driver, parent, byXPath, exist, time, comment) {
    
    let foundElem = null;
    let condition = new webdriver.Condition('', async function (webdriver) {
        let elems = await parent.findElements(byXPath);
        if (exist) {
            if (elems && elems.length !== 0) {
                foundElem = elems[0];
                return true;
            } else
                return false;
        } else    
            return !elems || elems.length === 0;
    });
    try {
        await driver.wait(condition, time);
        return { ok: true, element: foundElem };
    } catch(e) {
        console.error(e, comment);
        return { ok: false, element: null };
    }   
}

exports.scrollTo = async function(driver, elem, offset) {
    
    offset = offset || 350;

    try {
        let loc = await elem.getRect();
        await driver.executeScript('return window.scrollTo(' + (loc.x) + ',' + (loc.y - offset) + ');');        
    } catch(e) {
        console.error(e, "Can't scroll to elem");
    }    

}