"use strict";
const webdriver = require("selenium-webdriver");
const config    = require("./config");
const InstagramClicker = require("./instagramclicker");

let By = webdriver.By;
let until = webdriver.until;

module.exports = class Bosslike {
    
    constructor(driver) {
        this.driver = driver;
    }

    async openVK(type) {
        this.social = 'vk';
        await this.driver.get(`http://bosslike.ru/tasks/vkontakte/${type}/`);
    }

    async openInstagram(type) {
        this.social = 'instagram';
        await this.driver.get(`http://bosslike.ru/tasks/instagram/${type}/`);
    }

    async waitForTasksToBeLoaded() {
        
        let _this = this;
        let condition = new webdriver.Condition('', async function (webdriver) {
            let elems = await _this.driver.findElements(By.id('pageLoader'));
            return elems.length === 0;
        });
        this.driver.wait(condition, 2000);
    }

     async waitForLogin() {
        
        let _this = this;
        let condition = new webdriver.Condition('', async function (webdriver) {
            let elems = await _this.driver.findElements(By.xpath('//a[text()="Вход"]'));
            return elems.length === 0;
        });
        this.driver.wait(condition, config.PAUSE.WAIT_FOR_LOGIN);
    }
    
      async waitForTaskToBeChecked() {
        
        let _this = this;
        let condition = new webdriver.Condition('', async function (webdriver) {
            let elems = await _this.driver.findElements(By.xpath('//*[contains(text(), "Выполнение не подтверждено")]'));
            return elems.length === 0;
        });
        this.driver.wait(condition, 10000);
    }

    async getTasksAndCompleteFirst() {
        
        this.mainWindow = await this.driver.getWindowHandle();

        let elements = await this.driver.findElements(By.xpath("//div[@class='task task-new']"));
        let elem = null;
        let result = false;
        for (let elem of elements) {
            
            let text = await elem.getText();
            text = text.replace(new RegExp('\n', 'g'), ' ');
            
            if (config.isBlocked(text)) {
                console.log("Blocked title: " + text);
                continue;
            }
            
            let result = await this.clickTask(elem, text, this.currentSocial);

            if (result) {
                break;
            }
        }

        return result;

    }

    async swithToTaskWindow() {
        
        let handles = await this.driver.getAllWindowHandles();
        for (let handle of handles) {
            if (handle !== this.mainWindow) {
                try {
                    await this.driver.switchTo().window(handle);
                    return true;
                } catch (e) {

                }
            }
        }

        return false;
    }

    async closeTaskWindow() {
        
        let handle = await this.driver.getWindowHandle();
        if (handle !== this.mainWindow) {
            await this.driver.close();        
        }   
        
    }

    async clickTask(elem, text, social) {
        
        let subElems = await elem.findElements(By.xpath('.//button'));
        if (subElems.length === 0) {
            console.log(text, subElems);
            console.log('Не найдено кнопки');
            return false;
        }

        let button = subElems[0];
        let className = await button.getAttribute('class');
        if (className.search('btn-success') !== -1)
            return false;
        
        let taskId = await button.getAttribute('data-task-id');
        /*
        let isBlockedTask = await dbLog.isBlocked(taskId);
        if (isBlockedTask) {
            console.log('Blocked ID: ' + taskId);
            return false;
        }
        */
        let loc = await button.getLocation();
        await this.driver.executeScript('return window.scrollTo(' + (loc.x - 350) + ',' + (loc.y - 350) + ');');

        try {
            await button.click();
        } catch(e) {
            console.log("Failed to click task button");
            console.log(e);
            return false;
        }   
        await config.sleep(config.PAUSE.AFTER_TASK_CLICK);
        
        console.log("" + taskId + ", " + text);

        let isSwithed = this.swithToTaskWindow();

        if (!isSwithed) {
            console.log("Can't switch window");
            await config.sleep(config.PAUSE.AFTER_FALSE_TASK);
            return false;
        }
    
        let socialClicker = null;
        if (this.social === 'vk') {
        }
        else if (this.social === 'instagram') {
            socialClicker = new InstagramClicker(this.driver, this.mainWindow);
        }
        
        let result = await socialClicker.click(text);
        
        try {
            await this.closeTaskWindow();
        } catch(e) {
            console.log("Failed to close task window");
            console.log(e);
        }    
        
        try {
            await this.driver.switchTo().window(this.mainWindow);
        } catch(e) {
            console.log("Can't switch to main window");
            console.log(e);
        }    

        try {
            this.waitForTaskToBeChecked();
        } catch(e) {
            console.log("waitForTaskToBeChecked");
            console.log(e);
        }    

        return result;

    }
}
