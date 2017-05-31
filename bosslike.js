"use strict";
const webdriver = require("selenium-webdriver");
const config    = require("./config");
const InstagramClicker = require("./instagramclicker");

const By    = webdriver.By;
const until = webdriver.until;
const Key   = webdriver.Key;

module.exports = class Bosslike {
    
    constructor(driver, dbLog) {
        this.driver = driver;
        this.dbLog = dbLog;
        this.skippedTasks = new Map;
    }

    async open() {
        await this.driver.get(`http://bosslike.ru/`);
    }
    
    async openVK(type) {
        this.social = 'vk';
        await this.driver.get(`http://bosslike.ru/tasks/vkontakte/${type}/`);
    }

    async openInstagram(type) {
        this.social = 'instagram';
        try{
            await this.driver.get(`http://bosslike.ru/tasks/instagram/${type}/`);
            return true;
        } catch(e) {
            console.log(config.errorColor, e.message, "\x1b[39m");  
            return false;            
        }   
    }

    async waitForTasksToBeLoaded() {
        
        let _this = this;
        let condition = new webdriver.Condition('', async function (webdriver) {
            let elems = await _this.driver.findElements(By.id('pageLoader'));
            return elems.length === 0;
        });
        this.driver.wait(condition, 3200);
    }

     async waitForLogin() {
        let _this = this;
        let condition = new webdriver.Condition('', async function (webdriver) {
            let elems = await _this.driver.findElements(By.xpath('//a[@class="navbar-brand"]'));
            return elems.length !== 0;
        });
        this.driver.wait(condition, config.PAUSE.WAIT_FOR_LOGIN);
    }
    
      async waitForTaskToBeChecked() {
        
        let _this = this;
        let condition = new webdriver.Condition('', async function (webdriver) {

            let xpathArr = [
                '//*[contains(text(), "Выполнение не подтверждено")]',
                '//*[contains(text(), "задание уже выполнено")]',
                '//*[contains(text(), "задания не существует")]'
                ];

            let elems = await _this.driver.findElements(By.xpath(xpathArr.join(' | ')));
            return elems === null || elems.length === 0;
        });

        try {
            this.driver.wait(condition, 10000);
        } catch(e) {
            console.log("Waiting for task to be checked failed");
            console.log(config.errorColor, e.message, "\x1b[39m");          
        }   
    }

    async getTasksAndCompleteFirst() {
        
        this.mainWindow = await this.driver.getWindowHandle();

        let elements = await this.driver.findElements(By.xpath("//div[contains(@class, 'task_item')]"));
        let elem = null;
        let result = false;
        for (let elem of elements) {
            
            let text = await elem.getText();
            text = text.replace(new RegExp('\n', 'g'), ' ');
            
            /*
            if (config.isBlocked(text)) {
                console.log("Blocked title: " + text);
                continue;
            }
            */
            
            this.socialClicker = null;
            if (this.social === 'vk') {
            }
            else if (this.social === 'instagram') {
                this.socialClicker = new InstagramClicker(this.driver, this.mainWindow);
            }

            this.socialClicker.setAction(text);
            if (!this.socialClicker.action) {
                console.log(text + ', unsupported');
                continue;
            }    

            let result = await this.clickTask(elem, text, '');
 
            if (result) {
                return result;
            }
        }

        console.log('No tasks');
        await config.sleep(config.PAUSE.NO_TASKS);
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

    async scrollToElement(elem) {
        try {
            let loc = await elem.getLocation();
            await this.driver.executeScript('return window.scrollTo(' + (loc.x - 350) + ',' + (loc.y - 350) + ');');        
        } catch(e) {
            console.log("Can't scroll to elem");
        }    
    }

    async hideTask(taskId, taskElem) {

        let elems = await taskElem.findElements(By.xpath('.//*[contains(text(), "Скрыть")]'));
        if (elems.length > 0) {
            try {
                let href = elems[0];
                this.waitForTaskToBeChecked();
                await this.scrollToElement(href);
                await href.click();
                console.log("Hide task: " + taskId);
            } catch(e) {
                console.log("Can't hide task: " + taskId);
                console.log(config.errorColor, e.message, "\x1b[39m");
            }    
        }

    }

    async clickTask(taskElem, text) {
        
        let subElems = await taskElem.findElements(By.xpath('.//button'));
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

        let taskParams = await this.dbLog.getTaskParams(taskId);
        if (taskParams) {
            let now = new Date;
            let date = new Date(taskParams.date*1000);
            let mins = 10 * 60 * 1000;
            if (now - date < mins) {
                console.log('' + taskId + ', ' + text + ', skipped. Time left: ' + (mins/1000 - Math.round((now - date) /1000)));
                //await this.hideTask(taskId, taskElem);
                config.sleep(500);
                return false;
            }
        }
        /*
        let isBlockedTask = await dbLog.isBlocked(taskId);
        if (isBlockedTask) {
            console.log('Blocked ID: ' + taskId);
            return false;
        }
        */
        let result = true;
        await this.scrollToElement(button);

        try {
            this.waitForTaskToBeChecked();
        } catch(e) {
            console.log("Waiting for task to be checked failed");
            console.log(config.errorColor + e.message, "\x1b[39m");
            result = false;
        }    
        
        if (result) {
            try {
                await button.click();
            } catch(e) {
                console.log("Failed to click task button");
                console.log(config.errorColor + e.message, "\x1b[39m");
                result = false;
            }   
        }

        let comment = '';
        if (result) {

            if (this.socialClicker.action === 'comment') {
                await config.sleep(500);
                comment = await this.getComment(taskElem, taskId);
                if (comment) {
                    let btnElems = await taskElem.findElements(By.xpath('.//button[text()="Оставить комментарий"]'));
                    if (btnElems.length !== 0) {

                        let bntComment = btnElems[0];
                        await this.scrollToElement(bntComment);
                        await config.sleep(500);
                        try {
                            await bntComment.click();
                        } catch(e) {
                            console.log("Can't click Comment button");
                            console.log(config.errorColor + e.message, "\x1b[39m");
                        }  
                    } else {
                        console.log('No button: Оставить комментарий');
                        result = false;
                    }
                } else {
                    console.log("No comment: " + taskId);
                    result = false;
                }     
            }
        }

        if (result) {
            await config.sleep(config.PAUSE.AFTER_TASK_CLICK);
            
            console.log("" + taskId + ", " + text + ', ' + comment);

            let isSwithed = this.swithToTaskWindow();

            if (!isSwithed) {
                console.log("Can't switch window");
                await config.sleep(config.PAUSE.AFTER_FALSE_TASK);
                result = false;
            }
        }
    
        result = await this.socialClicker.doAction(comment);
        
        try {
            await this.closeTaskWindow();
        } catch(e) {
            console.log("Failed to close task window");
            console.log(config.errorColor + e.message, "\x1b[39m");
        }    
        
        try {
            await this.driver.switchTo().window(this.mainWindow);
        } catch(e) {
            console.log("Can't switch to main window");
            console.log(config.errorColor + e.message, "\x1b[39m");
        }  

         let condition = new webdriver.Condition('', async function (webdriver) {
             try {
                 let elems = await taskElem.findElements(By.xpath('.//button[text()="Проверка"]'));
                 return elems.length === 0;
             } catch(e) {
                 console.log(config.errorColor + e.message, "\x1b[39m");
                 return false;
             }   
        });

        try { 
            this.driver.wait(condition, 3000);
        } catch(e) {

        }

        if (result && this.socialClicker.action === 'subscribe') {
            await config.sleep(config.PAUSE.BEFORE_UNSUBSCRIBE);
            await this.unsubscribe();
        }  

        if (this.socialClicker.action === 'comment') {
            this.dbLog.addTask(taskId, result);
        }    

        return result;

    }

    async unsubscribe(){
        
        await this.driver.executeScript(`window.open()`);
        console.log('unsubscribe: ' + this.socialClicker.url);

        let isSwithed = this.swithToTaskWindow();
        if (isSwithed) {
            await this.driver.get(this.socialClicker.url);
            await this.socialClicker.unsubscribe();
        }
        
        try {
            await this.closeTaskWindow();
        } catch(e) {
            console.log("Failed to close unsubscribe window");
            console.log(config.errorColor + e.message, "\x1b[39m");
        }  
        
        await this.driver.switchTo().window(this.mainWindow);
    }

    async getComment(taskElem, taskId) {
        
        let _this = this;
        let condition = new webdriver.Condition('', async function (webdriver) {
            let elems = await taskElem.findElements(By.xpath('.//div[@class="form-group comment-place"]'));
            return elems.length !== 0;
        });
        try {
            this.driver.wait(condition, 1000);
        } catch(e) {
            console.log("Can't get comment");
            console.log(config.errorColor + e.message, "\x1b[39m");
            return ';'
        }   

        let elems = await taskElem.findElements(By.xpath('.//*[contains(text(), "Напишите осознанный комментарий")]'));
        if (elems.length !== 0) {
            
            let commentsArr = ['класс', 'круто', 'вау', 'wow', 'great', 'nice', 'не полхо', 'отлично', 'супер', '+'];
            let index = Math.floor(Math.random() * commentsArr.length);

            return commentsArr[index];
        }

        elems = await this.driver.findElements(By.xpath(`//*[@id="taskComment${taskId}"]`));
        if (elems.length !== 0) {
            try {
                let comment = await elems[0].getAttribute("value");
                return comment;
            } catch(e) {
                console.log("Can't get comment");
                console.log(config.errorColor + e.message, "\x1b[39m");
                return '';
            }    
        }

        return '';    
    
   }
}
