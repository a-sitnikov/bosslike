"use strict";
const webdriver = require("selenium-webdriver");
const chrome    = require("selenium-webdriver/chrome");

const Bosslike = require("./bosslike");
const config   = require("./config");
const DBLog    = require('./dblog');

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

let args = process.argv.splice(2);
let profile = args[0];
if (!profile) {
    profile = config.chrome_options.profile;
}
let count = parseInt(args[1]);


let arr = profile.split(new RegExp('\\\\|\\/', 'g'));
let accName = arr[arr.length - 1];
let dbname = 'bosslike_' + accName + '.sqlite3';

let logFile = fs.createWriteStream(`${__dirname}/${accName}.log`, {flags : 'w'});
console.log = config.customLog(logFile);

console.log(dbname);
const db = new sqlite3.Database(dbname);

function connectBrowser() {
    
    let options = new chrome.Options();
    
    options.setChromeBinaryPath(config.chrome_options.binaryPath);
    options.addArguments('user-data-dir=' + profile);
    options.addArguments('disable-infobars');
    options.addArguments('no-pings');
    //options.addArguments('single-process');
    //options.addArguments('disable-session-crashed-bubble');
    //options.addArguments('dns-prefetch-disable');  

    let driver = new webdriver.Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

    driver.manage().timeouts().implicitlyWait(1000); 
    driver.manage().timeouts().pageLoadTimeout(40*1000);

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

    let taskTypes = ['like', 'subscribe', 'comment'];

    for (let i = 0; i < count; i++) {
        
        if (i % 10 === 0) {
            console.log("\x1b[33m" + i, (new Date).toISOString(), "\x1b[39m");
        } else {
            console.log("\x1b[33m" + i, "\x1b[39m");
        }

        let taskType = taskTypes[i % taskTypes.length];

        if (!bosslike.openInstagram(taskType)) {
            await config.sleep(config.PAUSE.NO_TASKS);
            continue;
        }    

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

        try {
            await bosslike.getTasksAndCompleteFirst();
        } catch(e) {
            console.log("Can't copmlete task");
            console.log(config.errorColor  + e.message, "\x1b[39m");
        }      
        await config.sleep(config.PAUSE.AFTER_TASK_COMPLETE);
    }   

    dbLog.close();
    if (count > 0) {
        driver.quit();
        console.log('Complete');
    }

};

run();