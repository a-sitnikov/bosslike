"use strict";

exports.PAUSE = {
    AFTER_TASK_CLICK: 1000,
    AFTER_FALSE_TASK: 1000,
    AFTER_JOIN_CLICK: 2000,
    AFTER_TASK_COMPLETE: 5000,
    BEFORE_UNSUBSCRIBE: 3000,
    MAXWAIT_FOR_PROTECT: 100000,
    WAIT_FOR_LOGIN: 100000,
    NO_TASKS:60000
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

exports.errorColor = "\x1b[35m";

exports.customLog = function(logFile) {

    return function(...data) {
        
        let str = data.join(' ') + '\n';
        logFile.write(str.replace("\x1b[33m", "").replace("\x1b[35m", "").replace("\x1b[39m", ""));
        process.stdout.write(str);
    }

}
