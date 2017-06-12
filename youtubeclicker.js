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
             
        let elemPaths = [];
        let elemPathsAlreadyDone = [];
       
        elemPathsAlreadyDone.push('//yt-formatted-string[contains(text(), "Подписка оформлена")]');
        elemPathsAlreadyDone.push('//yt-formatted-string[contains(text(), "Subscribed ")]');
        elemPathsAlreadyDone.push('//yt-formatted-string[text()="Subscribed"]');
        
        elemPaths.push('//yt-formatted-string[contains(text(), "Subscribe ")]');
        elemPaths.push('//yt-formatted-string[text()="Subscribe"]');
        elemPaths.push('//yt-formatted-string[contains(text(), "Подписаться")]');

        let result = await this.fimdElemAndClick(elemPaths, elemPathsAlreadyDone, null, 'Dialog opened');
        if (!result) return false;

        // confirm dialog
        let driver = this.driver;
        let condition = new webdriver.Condition('', async function (webdriver) {
            try {
                let elems = await driver.findElements(By.xpath('//ytd-confirm-dialog-renderer'));
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
        }

        elemPaths = [];
        elemPaths.push('//yt-formatted-string[@id="text"][text()="Unsubscribe"]');
        elemPaths.push('//yt-formatted-string[@id="text"][text()="Да"]');
        elemPathsAlreadyDone = [];     
        
        result = await this.fimdElemAndClick(elemPathsAlreadyDone, elemPaths);
        return result;
     }
    
    async fimdElemAndClick(elemPathsAlreadyDone, elemPaths, comment, logText){

        logText = logText || 'Done';
        let elems = null; 
        try {
            elems = await this.driver.findElements(By.xpath('//*[contains(text(), "Sorry, this page")]'));
            if (elems && elems.length > 0) {
                console.log("Sorry, this page doesn't availibale");
                return false;
            }
        } catch(e) {
            console.error(e, "Finding element failed");
        }   

        if (elemPathsAlreadyDone.length > 0){
            try {
                elems = await this.driver.findElements(By.xpath(elemPathsAlreadyDone.join(' | ')));
                if (elems && elems.length > 0) {
                    console.log('Alredy done');
                    return this.action === 'subscribe' ? true: false;
                }
            } catch(e) {
                console.error(e, "Finding element failed: " + elemPathsAlreadyDone);
            }  
        } 

        let currElem = null;
        try {
            elems = await this.driver.findElements(By.xpath(elemPaths.join(' | ')));
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
                result = true;
                console.log(logText);
                await config.sleep(config.PAUSE.AFTER_JOIN_CLICK);
            } catch(e) {
                result = false;
                console.error(e, 'Failed to click Like button');
            }   

        } else {
            console.log('no element');
            result = false;
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

             elemPathsAlreadyDone.push('//yt-formatted-string[contains(text(), "Подписка оформлена")]');
             elemPathsAlreadyDone.push('//yt-formatted-string[contains(text(), "Subscribed ")]');
             elemPathsAlreadyDone.push('//yt-formatted-string[text()="Subscribed"]');
             
             elemPaths.push('//yt-formatted-string[contains(text(), "Subscribe ")]');
             elemPaths.push('//yt-formatted-string[text()="Subscribe"]');
             elemPaths.push('//yt-formatted-string[contains(text(), "Подписаться")]');

        } else if (this.action === 'comment') {  
             
             elemPaths.push('//input[contains(@placeholder, "comment")]');
             elemPaths.push('//textarea[contains(@placeholder, "comment")]');

        }    

        if (!this.action) return false;
        
        if (this.action === 'watch') {
            await config.sleep(40000);
            return true;

        } else {
            return await this.fimdElemAndClick(elemPathsAlreadyDone, elemPaths, comment);
        }    

    }
}
