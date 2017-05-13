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
        
        let _this = this;
        let condition = new webdriver.Condition('', async function (webdriver) {
            let elems = await _this.driver.findElements(By.xpath('//*[contains(text(), "В социальных сетях существуют лимиты")]'));
            return elems.length === 0;
        });

        try {
            this.driver.wait(condition, config.PAUSE.MAXWAIT_FOR_PROTECT);
            return true;
        } catch(e) {
            return false;
        }    
    }
    
    async click(text) {

        if (!this.waitForPageToBeEnabled()) {
            console.log("Waiting for page failed");
            return false;
        }    

        let elemPaths = [];
        let elemPathsAlreadyDone = [];
    
         if (text.search('Лайкнуть') === 0) {
            
            elemPathsAlreadyDone.push(By.xpath('//span[text()="Unlike"]'));
            elemPaths.push(By.xpath('//span[text()="Like"]'));

         }

        for (let path of elemPathsAlreadyDone) {

            let elems = await this.driver.findElements(path);
            if (elems.length > 0) {
                console.log('Alredy done');
                return false;
            }
        }

        let currElem = null;
        for (let path of elemPaths) {

            let elems = await this.driver.findElements(path);

            if (elems.length > 0) {
                currElem = elems[0];
                break;
            }

        }

        let result = null;
        if (currElem) {
            
            let loc = await currElem.getLocation();
            await this.driver.executeScript('return window.scrollTo(' + (loc.x - 350) + ',' + (loc.y - 350) + ');');
        
            await currElem.click();
            result = true;
            console.log('Done');
            await config.sleep(config.PAUSE.AFTER_JOIN_CLICK);
        } else {
            console.log('no element');
            result = false;
        }

        return result;

    }
}
