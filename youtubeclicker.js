"use strict";

const config = require('./config');
const webdriver = require("selenium-webdriver");

let By = webdriver.By;
let until = webdriver.until;

module.exports = class YoutubeClicker {
    
    constructor(driver, mainWindow) {
        this.driver = driver;
        this.mainWindow = mainWindow;
        //this.taskTypes = ['all', 'like', 'subscribe', 'comment', 'watch'];
        //this.taskTypes = ['subscribe'];
        this.taskTypes = ['subscribe', 'watch'];

        this.paths = {
            subscribe: {
                paths: [
                    '//div[contains(@class, "primary-header-contents")]//*[contains(text(), "Subscribe ") or text()="Subscribe"]',
                    '//div[@id="channel-header"]//*[contains(text(), "Subscribe ") or text()="Subscribe" or contains(text(), "Подписаться")]'
                ],
                alreadyDone: [
                    '//div[@id="channel-header"]//*[contains(text(), "Subscribed ") or text()="Subscribed" or contains(text(), "Подписка оформлена")]'    
                ]
            }
        }

    };

    async waitForPageToBeEnabled() {
        
        let _this = this;
        let condition = new webdriver.Condition('', async function (webdriver) {
            try {
                let elems = await _this.driver.findElements(By.xpath('//*[contains(text(), "В социальных сетях существуют лимиты")]'));
                return elems === null || elems.length === 0;
            } catch(e) {
                console.error(e, "");
                return false;
            }    
        });

        try {
            await this.driver.wait(condition, config.PAUSE.MAXWAIT_FOR_PROTECT);
            return true;
        } catch(e) {
            console.error(e, "");
            return false;
        }    
    }
    
    async windowClosed() {
        let handles = await this.driver.getAllWindowHandles();
        if (handles.length === 1) {
            return true;
        }        
        return false
    }

    async unsubscribe() {
        
        //this.driver.get(this.url);
             
        let elemPathsAlreadyDone = this.paths.subscribe.paths;
        let elemPaths = this.paths.subscribe.alreadyDone;

        let result = await this.fimdElemAndClick(elemPathsAlreadyDone,  elemPaths, null, 'Dialog opened', 200);
        if (result !== 'OK') return false;

        let dialogXPath = By.xpath('//*[contains(name(), "confirm-dialog-renderer") or contains(@class, "dialog-show")]');
        // confirm dialog
        let driver = this.driver;
        let condition = new webdriver.Condition('', async function (webdriver) {
            try {
                let elems = await driver.findElements(dialogXPath);
                return elems.length !== 0;
            } catch(e) {
                console.error(e, "");
                return false;
            } 
        });

        try { 
            await this.driver.wait(condition, 10000);
        } catch(e) {
            console.error(e, "Waiting for confirm dialog failed");
            return false;
        }

        let dialog;
        try {
            dialog = await driver.findElement(dialogXPath);
        } catch(e){
            console.error(e, "");
            return false;
        }

        elemPaths = [];
        elemPaths.push('.//yt-formatted-string[@id="text"][text()="Unsubscribe" or text()="Да"]');
        elemPaths.push('.//span[text()="Unsubscribe"]');
        elemPathsAlreadyDone = [];     
        
        result = await this.fimdElemAndClick(elemPathsAlreadyDone, elemPaths, null, null, dialog);
        return result;
     }
    
    async fimdElemAndClick(elemPathsAlreadyDone, elemPaths, comment, logText, pause, parent){

        pause = pause || config.PAUSE.AFTER_JOIN_CLICK;
        logText = logText || 'Done';
        parent = parent || this.driver;
        let elems = null; 
        try {
            elems = await this.driver.findElements(By.xpath('//*[contains(text(), "Sorry, this page")]'));
            if (elems && elems.length > 0) {
                console.log("Sorry, this page doesn't availibale");
                return "Page doesn't availibale";
            }
        } catch(e) {
            console.error(e, "Finding element failed");
        }   

        if (elemPathsAlreadyDone.length > 0){
            try {
                elems = await parent.findElements(By.xpath(elemPathsAlreadyDone.join(' | ')));
                if (elems && elems.length > 0) {
                    console.log('Alredy done');
                    return 'Alredy done';
                }
            } catch(e) {
                console.error(e, "Finding element failed: " + elemPathsAlreadyDone);
            }  
        } 

        let currElem = null;
        try {
            elems = await parent.findElements(By.xpath(elemPaths.join(' | ')));
            if (elems && elems.length > 0) {
                currElem = elems[0];
            }
        } catch(e) {
            console.error(e, "Finding element failed: " + elemPaths);
        }  
        
        let result = null;
        if (currElem) {
            
            try {
                let loc = await currElem.getLocation();
                await this.driver.executeScript('return window.scrollTo(' + (loc.x - 350) + ',' + (loc.y - 350) + ');');
            } catch(e) {
                console.error(e, "Failed to scroll to Like button");
            }    
        
            try {
                if (this.action === 'comment') {
                    await currElem.sendKeys(comment);
                    await currElem.submit();
                } else {
                    await currElem.click();
                }    
                result = 'OK';
                console.log(logText);
                await config.sleep(pause);
            } catch(e) {
                result = 'Failed to click button';
                console.error(e, 'Failed to click button');
            }   

        } else {
            console.log('no element');
            result = 'No element';
        }
    
        await config.sleep(3000);
        return result;

    }
    
    setAction(text) {
        if (text.search('Лайкнуть') === 0) {
            this.action = 'like';
        } else if (text.search('Подписаться') === 0) {
            this.action = 'subscribe';
        } else if (text.search('Оставить комментарий') === 0) {
            this.action = 'comment';
        } else if (text.search('Посмотреть') === 0) {
            this.action = 'watch';
        }    
    }

    async doAction(comment) {

        if (await this.windowClosed()) {
            console.log("Window already closed");
            return false;
        }

        if (!this.waitForPageToBeEnabled()) {
            console.log("Waiting for page failed");
            return false;
        }    

        if (await this.windowClosed()) {
            console.log("Window already closed");
            return false;
        }
        
        this.url = await this.driver.getCurrentUrl();
        let elemPaths = [];
        let elemPathsAlreadyDone = [];
    
        if (this.action === 'like') {
            
             elemPathsAlreadyDone.push('//span[text()="Unlike"]');
             elemPaths.push('//span[text()="Like"]');
 
        } else if (this.action === 'subscribe') {

             elemPathsAlreadyDone = this.paths.subscribe.alreadyDone;
             elemPaths            = this.paths.subscribe.paths;

        } else if (this.action === 'comment') {  
             
             elemPaths.push('//input[contains(@placeholder, "comment")]');
             elemPaths.push('//textarea[contains(@placeholder, "comment")]');

        }    

        if (!this.action) return false;
        
        if (this.action !== 'watch') {
            let result = await this.fimdElemAndClick(elemPathsAlreadyDone, elemPaths, comment);
            return result === 'OK' || result === 'Already done';
        }    
        
        await config.sleep(40000);

    }
}
