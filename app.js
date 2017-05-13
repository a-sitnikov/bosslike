"use strict";
const Bosslike = require("./bosslike");
const config = require("./config");

async function run() {
    
    let bosslike = new Bosslike;
    let driver = bosslike.connectBrowser();
    for (let i = 0; i < 1; i++) {
        
        if (i % 10 === 0) {
            console.log(i, (new Date).toISOString());
        } else {
            console.log(i);
        }
        bosslike.openInstagram('like');
        bosslike.waitForTasksToBeLoaded();

        await bosslike.getTasksAndCompleteFirst();
        await config.sleep(config.PAUSE.AFTER_TASK_COMPLETE);
    }   

    driver.quit();
    console.log('Complete');
};

run();