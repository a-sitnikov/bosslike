"use strict";

const config = require('./config');
const webdriver = require("selenium-webdriver");

let By = webdriver.By;
let until = webdriver.until;

module.exports = class InstagramClicker {
    
    constructor(driver, mainWindow) {
        this.driver = driver;
        this.mainWindow = mainWindow;
    };

    async waitForPageToBeEnabled() {
        
        try {
            
            let _this = this;
            let condition = new webdriver.Condition('', async function (webdriver) {
                try {
                    let elems = await _this.driver.findElements(By.xpath('//*[contains(text(), "В социальных сетях существуют лимиты")]'));
                    return elems.length === 0;
                } catch(e) {
                    console.error(e, "");
                    return false;
                }    
            });

            this.driver.wait(condition, config.PAUSE.MAXWAIT_FOR_PROTECT);
            return true;

        } catch(e) {
            console.error(e, "");
            return false;
        }    
    }
    
    async waitForInstagramPageLoaded() {
        
        try {
            
            let _this = this;
            let condition = new webdriver.Condition('', async function (webdriver) {
                try {
                    let elems = await _this.driver.findElements(By.xpath('//span[contains(text(), "Instagram")]'));
                    return elems.length !== 0;
                } catch(e) {
                    console.error(e, "");
                    return false;
                }    
            });

            this.driver.wait(condition, config.PAUSE.MAXWAIT_FOR_PROTECT);
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
        
        elemPaths.push('//button[text()="Following"]');
        elemPathsAlreadyDone.push('//button[text()="Follow"]');

        let result = await this.fimdElemAndClick(elemPathsAlreadyDone, elemPaths);
        return result;
     }
    
    async fimdElemAndClick(elemPathsAlreadyDone, elemPaths, comment){

        let elems = null; 
        try {
            elems = await this.driver.findElements(By.xpath('//*[contains(text(), "Sorry, this page")]'));
            if (elems.length > 0) {
                console.log("Sorry, this page doesn't exists");
                return false;
            }
        } catch(e) {
            console.error(e, "Finding element failed");
        }   

        if (elemPathsAlreadyDone.length > 0){
            try {
                elems = await this.driver.findElements(By.xpath(elemPathsAlreadyDone.join(' | ')));
                if (elems.length > 0) {
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
            if (elems.length > 0) {
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
                console.log('Done');
                await config.sleep(config.PAUSE.AFTER_JOIN_CLICK);
            } catch(e) {
                result = false;
                console.error(e, 'Failed to click Like button');
            }   

        } else {
            console.log('no element');
            result = false;
        }
    
        return result;

    }
    
    setAction(text) {
        if (text.search('Лайкнуть') === 0) {
            this.action = 'like';
        } else if (text.search('Подписаться') === 0) {
            this.action = 'subscribe';
        } else if (text.search('Оставить комментарий') === 0) {
            this.action = 'comment';
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
        
        //span[contains(text(), "Instagram")]
        this.waitForInstagramPageLoaded();

        this.url = await this.driver.getCurrentUrl();
        let elemPaths = [];
        let elemPathsAlreadyDone = [];
    
        if (this.action === 'like') {
            
             elemPathsAlreadyDone.push('//span[text()="Unlike"]');
             elemPaths.push('//span[text()="Like"]');
 
        } else if (this.action === 'subscribe') {

             elemPathsAlreadyDone.push('//button[text()="Following"]');
             elemPaths.push('//button[text()="Follow"]');

        } else if (this.action === 'comment') {  
             
             elemPaths.push('//input[contains(@placeholder, "comment")]');

        }    

        if (!this.action) return false;
        
        let result = await this.fimdElemAndClick(elemPathsAlreadyDone, elemPaths, comment);
        return result;

    }
}
