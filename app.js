"use strict";
const webdriver = require("selenium-webdriver");
const chrome    = require("selenium-webdriver/chrome");

const Bosslike = require("./bosslike");
const config = require("./config");

function connectBrowser() {
    
    let options = new chrome.Options();
    
    options.setChromeBinaryPath(config.chrome_options.binaryPath);
    options.addArguments('user-data-dir=' + config.chrome_options.profile);
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

    for (let i = 0; i < 100; i++) {
        
        if (i % 10 === 0) {
            console.log(i, (new Date).toISOString());
        } else {
            console.log(i);
        }
        bosslike.openInstagram('like');
        
        try {
            bosslike.waitForLogin();
        } catch(e) {
            console.log("Login not perfomed");
            console.log(e);
            return;
        }   

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

    driver.quit();
    console.log('Complete');
};

run();