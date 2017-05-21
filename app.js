"use strict";
const webdriver = require("selenium-webdriver");
const chrome    = require("selenium-webdriver/chrome");

const Bosslike = require("./bosslike");
const config   = require("./config");
const DBLog    = require('./dblog');

const sqlite3 = require('sqlite3').verbose();

let args = process.argv.splice(2);
let profile = args[0];
if (!profile) {
    profile = config.chrome_options.profile;
}
let count = parseInt(args[1]);

let arr = profile.split(new RegExp('\\\\|\\/', 'g'));
let accName = arr[arr.length - 1];
let dbname = 'bosslike_' + accName + '.sqlite3';
console.log(dbname);
const db = new sqlite3.Database(dbname);

function connectBrowser() {
    
    let options = new chrome.Options();
    
    options.setChromeBinaryPath(config.chrome_options.binaryPath);
    options.addArguments('user-data-dir=' + profile);
    options.addArguments('disable-session-crashed-bubble');
    options.addArguments('disable-infobars');

    let driver = new webdriver.Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

    return driver;    
}

async function run() {
    
    let driver = connectBrowser();
    let dbLog = new DBLog(db);
    let bosslike = new Bosslike(driver, dbLog);
    bosslike.openInstagram('all');     
    try {
        bosslike.waitForLogin();
    } catch(e) {
        console.log("Login not perfomed");
        console.log(e);
        return;
    } 

    for (let i = 0; i < count; i++) {
        
        if (i % 10 === 0) {
            console.log("\x1b[33m" + i, (new Date).toISOString(), "\x1b[39m");
        } else {
            console.log("\x1b[33m" + i, "\x1b[39m");
        }
        bosslike.openInstagram('all');
        try {
            await driver.executeScript(`window.document.title = "${accName}"`);
        } catch(e){
            console.log(config.errorColor  + e.message, "\x1b[39m");
        }
        
        try {
            bosslike.waitForTasksToBeLoaded();
        } catch(e) {
            console.log("Tasks not loaded");
            console.log(config.errorColor  + e.message, "\x1b[39m");
            continue;
        }   

        await bosslike.getTasksAndCompleteFirst();
        await config.sleep(config.PAUSE.AFTER_TASK_COMPLETE);
    }   

    dbLog.close();
    if (count > 0) {
        driver.quit();
        console.log('Complete');
    }

};

run();