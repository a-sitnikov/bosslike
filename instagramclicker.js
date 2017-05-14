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
                let elems = await _this.driver.findElements(By.xpath('//*[contains(text(), "В социальных сетях существуют лимиты")]'));
                return elems.length === 0;
            });

            this.driver.wait(condition, config.PAUSE.MAXWAIT_FOR_PROTECT);
            return true;

        } catch(e) {
            console.log(e);
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
    
    async click(text) {

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
        
        let elemPaths = [];
        let elemPathsAlreadyDone = [];
    
         if (text.search('Лайкнуть') === 0) {
            
            elemPathsAlreadyDone.push(By.xpath('//span[text()="Unlike"]'));
            elemPathsAlreadyDone.push(By.xpath('//*[contains(text(), "Sorry, this page")]'));

            elemPaths.push(By.xpath('//span[text()="Like"]'));

         }

        for (let path of elemPathsAlreadyDone) {

            try {
                let elems = await this.driver.findElements(path);
                if (elems.length > 0) {
                    console.log('Alredy done');
                    return false;
                }
            } catch(e) {
                console.log("Finding element failed: " + path);
                console.log(e);
            }   
        }

        let currElem = null;
        for (let path of elemPaths) {

             try {
                 let elems = await this.driver.findElements(path);

                 if (elems.length > 0) {
                     currElem = elems[0];
                     break;
                 }
             } catch(e) {
                console.log("Finding element failed: " + path);
                console.log(e);
             }  

        }

        let result = null;
        if (currElem) {
            
            try {
                let loc = await currElem.getLocation();
                await this.driver.executeScript('return window.scrollTo(' + (loc.x - 350) + ',' + (loc.y - 350) + ');');
            } catch(e) {
                console.log("Failed to scroll to Like button");
                console.log(e);                
            }    
        
            try {
                await currElem.click();
                result = true;
                console.log('Done');
                await config.sleep(config.PAUSE.AFTER_JOIN_CLICK);
            } catch(e) {
                result = false;
                console.log('Failed to click Like button');
                console.log(e);   
            }   

        } else {
            console.log('no element');
            result = false;
        }

        return result;

    }
}
