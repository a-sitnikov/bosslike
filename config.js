"use strict";

exports.PAUSE = {
    AFTER_TASK_CLICK: 1000,
    AFTER_FALSE_TASK: 1000,
    AFTER_JOIN_CLICK: 3000,
    AFTER_TASK_COMPLETE: 3000,
    MAXWAIT_FOR_PROTECT: 100000
};

exports.chrome_options = {
    "binaryPath": "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "profile": "C:/tmp/chrome"
};

function sleep(par) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(par), par);
    });
}

exports.sleep = sleep;
