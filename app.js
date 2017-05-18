"use strict";
const webdriver = require("selenium-webdriver");
const chrome    = require("selenium-webdriver/chrome");

const Bosslike = require("./bosslike");
const config = require("./config");

let args = process.argv.splice(2);
let profile = args[0];
if (!profile) {
    profile = config.chrome_options.profile;
}
let count = parseInt(args[1]);

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
    let bosslike = new Bosslike(driver);
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
            console.log(i, (new Date).toISOString());
        } else {
            console.log(i);
        }
        bosslike.openInstagram('all');
        
        try {
            bosslike.waitForTasksToBeLoaded();
        } catch(e) {
            console.log("Tasks not loaded");
            console.log(e);
            continue;
        }   

        await bosslike.getTasksAndCompleteFirst();
        await config.sleep(config.PAUSE.AFTER_TASK_COMPLETE);
    }   

    if (count > 0) {
        driver.quit();
        console.log('Complete');
    }

};

run();