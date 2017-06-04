"use strict";
const webdriver = require("selenium-webdriver");
const chrome    = require("selenium-webdriver/chrome");
const argv      = require('minimist')(process.argv.slice(2));

const Bosslike = require("./bosslike");
const config   = require("./config");
const DBLog    = require('./dblog');

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

let profile = argv.profile;
let count = parseInt(argv.count || 0);
let social = argv.social || 'instagram';

let arr = profile.split(new RegExp('\\\\|\\/', 'g'));
let accName = arr[arr.length - 2];
let dbname = 'bosslike_' + accName + '.sqlite3';

let logFile = fs.createWriteStream(`${__dirname}/${accName}.log`, {flags : 'w'});
console.log = config.customLog(logFile);
console.error = config.customError(logFile);

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

    driver.manage().timeouts().implicitlyWait(1500); 
    driver.manage().timeouts().pageLoadTimeout(40*1000);

    return driver;    
}

async function run() {
    
    let driver = connectBrowser();
    let dbLog = new DBLog(db);
    let bosslike = new Bosslike(driver, dbLog);
    bosslike.mainWindow = await bosslike.driver.getWindowHandle();

    bosslike.open(social, 'all');     
    try {
        bosslike.waitForLogin();
    } catch(e) {
        console.error(e, "Login not perfomed");
        return;
    } 

    for (let i = 0; i < count; i++) {
        
        if (i % 10 === 0) {
            console.log("\x1b[33m" + i, (new Date).toISOString(), "\x1b[39m");
        } else {
            console.log("\x1b[33m" + i, "\x1b[39m");
        }

        let taskType = bosslike.getTaskType(i);

        if (!bosslike.open(social, taskType)) {
            await config.sleep(config.PAUSE.NO_TASKS);
            continue;
        }    

        try {
            await driver.executeScript(`window.document.title = "${accName}"`);
        } catch(e){
            console.error(e, "");
        }
        
        try {
            await bosslike.waitForTasksToBeLoaded();
        } catch(e) {
            console.error(e, "Tasks not loaded");
            continue;
        }   

        try {
            await bosslike.getTasksAndCompleteFirst();
        } catch(e) {
            console.error(e, "Can't copmlete task");
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