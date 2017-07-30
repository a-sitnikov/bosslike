"use strict";

const config = require('./config');
const webdriver = require("selenium-webdriver");

let By = webdriver.By;
let until = webdriver.until;

module.exports = class InstagramClicker {
    
    constructor(driver, mainWindow) {
        this.driver = driver;
        this.mainWindow = mainWindow;
        this.taskTypes = ['all', 'like', 'subscribe', 'comment'];

        this.paths = {
            like: {
                paths:       ['//span[text()="Like"]'],
                alreadyDone: ['//span[text()="Unlike"]']
            },

            subscribe: {
                paths:       ['//button[text()="Follow"]'],
                alreadyDone: ['//button[text()="Following"]']
            },
            comment: {
                paths: [
                    '//input[contains(@placeholder, "comment")]',
                    '//textarea[contains(@placeholder, "comment")]'    
                ],
                alreadyDone: []
            }
        }
    };

    async waitForPageToBeEnabled() {
        
        return (await config.waitFor(this.driver, this.driver,
            By.xpath('//*[contains(text(), "В социальных сетях существуют лимиты")]'),
            false, config.PAUSE.MAXWAIT_FOR_PROTECT,
            ""
        )).ok;
            
    }
    
    async waitForInstagramPageLoaded() {
        
        let _this = this;
        let condition = new webdriver.Condition('', async function (webdriver) {
            try {
                let elems = await _this.driver.findElements(By.xpath('//span[contains(text(), "Instagram")] | //span[contains(text(), "INSTAGRAM")]'));
                return elems && elems.length !== 0;
            } catch(e) {
                console.error(e, "");
                return false;
            }    
        });

        try {
            await this.driver.wait(condition, 5000);
            return true;
        } catch(e) {
            console.error(e, "Waiting span Instagram failed");
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
             
        let elemPaths = this.paths.subscribe.alreadyDone;
        let elemPathsAlreadyDone = this.paths.subscribe.paths;

        let result = await this.fimdElemAndClick(elemPathsAlreadyDone, elemPaths);
        return result;
     }
    
    async fimdElemAndClick(elemPathsAlreadyDone, elemPaths, comment){

        let elems = null; 
        try {
            elems = await this.driver.findElements(By.xpath('//*[contains(text(), "Sorry, this page")]'));
            if (elems && elems.length > 0) {
                console.log("Sorry, this page isn't available");
                return false;
            }
        } catch(e) {
            console.error(e, "Finding element failed");
        }   

        if (elemPathsAlreadyDone.length > 0){
            try {
                elems = await this.driver.findElements(By.xpath(elemPathsAlreadyDone.join(' | ')));
                if (elems && elems.length > 0) {
                    console.log('Already done');
                    return 'Already done';
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
            
            await config.scrollTo(this.driver, currElem);
        
            try {
                if (this.action === 'comment') {
                    await currElem.sendKeys(comment);
                    await currElem.submit();
                } else {
                    await currElem.click();
                }    
                result = 'OK';
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
        //this.waitForInstagramPageLoaded();

        this.url = await this.driver.getCurrentUrl();
        let elemPaths            = this.paths[this.action].paths;
        let elemPathsAlreadyDone = this.paths[this.action].alreadyDone;
    
        let result = await this.fimdElemAndClick(elemPathsAlreadyDone, elemPaths, comment);
        return result;

    }
}
