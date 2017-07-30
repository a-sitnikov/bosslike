"use strict";

const config = require('./config');
const webdriver = require("selenium-webdriver");

let By = webdriver.By;
let until = webdriver.until;

module.exports = class YoutubeClicker {
    
    constructor(driver, mainWindow) {
        this.driver = driver;
        this.mainWindow = mainWindow;
        this.taskTypes = ['all', 'like', 'subscribe', 'comment', 'watch'];
        //this.taskTypes = ['like', 'subscribe', 'watch'];
        //this.taskTypes = ['subscribe'];

        this.paths = {
            subscribe: {
                paths: [
                    '//*[@id="channel-container"]//*[@id="subscribe-button"]//*[contains(text(), "Подписаться")]'
                ],
                alreadyDone: [
                    '//*[@id="channel-container"]//*[@id="subscribe-button"]//*[contains(text(), "Подписка оформлена")]'
                ]
            },
            like: {
                paths: ['//button[contains(@aria-label, "Видео понравилось")][@aria-pressed="false"]'],
                alreadyDone: ['//div[@id="info"]//button[@aria-pressed="true"]']
            },
            comment: {
                paths: ['//textarea[@id="textarea"]'],
                alreadyDone: []
            }
        }

    };

    async waitForPageToBeEnabled() {
        
        return await config.waitFor(this.driver, this.driver,
            By.xpath('//*[contains(text(), "В социальных сетях существуют лимиты")]'),
            false, config.PAUSE.MAXWAIT_FOR_PROTECT,
            ""
        ).ok;
            
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
                    console.log('Already done');
                    return 'Already done';
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
                    let submitBtn = await this.driver.findElement(By.xpath('//*[text()="Оставить комментарий"]/../..'));
                    await config.sleep(500);
                    await submitBtn.click();
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
 
        if (this.action !== 'watch') {

            if (this.action === 'comment') {

                await this.driver.executeScript('return window.scrollTo(0, 400);');                  
                let result = await config.waitFor(this.driver, this.driver, 
                    By.xpath('//*[contains(text(), "ваш комментарий") or text()="Оставьте комментарий"]'), 
                    true, 20000, "Can't find comment elem");

                if (result.ok) {
                    try {
                        result.element.click();
                    } catch(e) {
                        console.error(e, "Failed to activate comment area");
                    }
                }
            }

            let elemPaths            = this.paths[this.action].paths;
            let elemPathsAlreadyDone = this.paths[this.action].alreadyDone; 
            let result = await this.fimdElemAndClick(elemPathsAlreadyDone, elemPaths, comment);
            await config.sleep(40000);
            return result;
        } else 
            await config.sleep(40000);
            return true;   
        
    }
}
