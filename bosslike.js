"use strict";
const webdriver = require("selenium-webdriver");
const config    = require("./config");
const InstagramClicker = require("./instagramclicker");
const YoutubeClicker = require("./youtubeclicker");

const By    = webdriver.By;
const until = webdriver.until;
const Key   = webdriver.Key;

module.exports = class Bosslike {
    
    constructor(driver, dbLog) {
        this.driver = driver;
        this.dbLog = dbLog;
        this.skippedTasks = new Map;
    }

    getTaskType(i) {
        return this.socialClicker.taskTypes[i % this.socialClicker.taskTypes.length];
    }

    async open(social, type) {

        social = social || 'instagram';
        if (social === 'instagram') await this.openInstagram(type); 
        else if (social === 'vk') await this.openVK(type); 
        else if (social === 'youtube') await this.openYoutube(type); 
    }
    
    async openVK(type) {
        this.social = 'vk';
        await this.driver.get(`http://bosslike.ru/tasks/vkontakte/${type}/`);
    }

    async openInstagram(type) {
        this.social = 'instagram';
        this.socialClicker = new InstagramClicker(this.driver, this.mainWindow);
        try{
            await this.driver.get(`http://bosslike.ru/tasks/instagram/${type}/`);
            return true;
        } catch(e) {
            console.error(e, "");  
            return false;            
        }   
    }
    
    async openYoutube(type) {
        this.social = 'youtube';
        this.socialClicker = new YoutubeClicker(this.driver, this.mainWindow);
        try{
            await this.driver.get(`http://bosslike.ru/tasks/youtube/${type}/`);
            return true;
        } catch(e) {
            console.error(e, "");  
            return false;            
        }   
    }

    async waitForTasksToBeLoaded() {
        
        return (await config.waitFor(this.driver, this.driver, 
            By.xpath('//*[@id="pageLoader"]'), 
            false, 3200, "")).ok;
    }

     async waitForLogin() {

        return (await config.waitFor(this.driver, this.driver, 
            By.xpath('//a[@class="navbar-brand"]'), 
            true, config.PAUSE.WAIT_FOR_LOGIN, "")).ok;
    }
    
      async waitForTaskToBeChecked() {
        
        let xpathArr = [
            '//*[contains(text(), "Выполнение не подтверждено")]',
            '//*[contains(text(), "задание уже выполнено")]',
            '//*[contains(text(), "задания не существует")]'
        ];

        return (await config.waitFor(this.driver, this.driver, 
            By.xpath(xpathArr.join(' | ')), 
            false, 10000, 
            "Waiting for task to be checked failed")).ok;
    }

    async getTasksAndCompleteFirst() {
        
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

            this.socialClicker.setAction(text);
            if (!this.socialClicker.action) {
                console.log(text + ', unsupported');
                continue;
            }    

            let result = await this.clickTask(elem, text, '');
 
            if (result === true || result === 'OK' || result === 'Already done') {
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
                    console.error(e, "");
                }
            }
        }

        return false;
    }

    async closeTaskWindow() {
        
        let handle = await this.driver.getWindowHandle();
        if (handle !== this.mainWindow) {
            try {
                await this.driver.close();        
            } catch(e) {
                console.error(e, "Failed to close task window");    
            }    
        }   
        
    }

    async hideTask(taskId, taskElem) {

        let elems = await taskElem.findElements(By.xpath('.//*[contains(text(), "Скрыть")]'));
        if (elems && elems.length > 0) {
            try {
                let link = elems[0];
                await this.waitForTaskToBeChecked();
                await config.scrollTo(this.driver, link);
                await link.click();
                console.log("Hide task: " + taskId);
            } catch(e) {
                console.error(e, "Can't hide task: " + taskId);
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

        let result = true;
        await config.scrollTo(this.driver, button);

        result = await this.waitForTaskToBeChecked();
        
        if (result) {
            try {
                await button.click();
            } catch(e) {
                console.error(e, "Failed to click task button");
                result = false;
            }   
        }
        
        result = await this.waitForTaskToBeChecked();

        let comment = '';
        if (result) {

            if (this.socialClicker.action === 'comment') {
                await config.sleep(500);
                comment = await this.getComment(taskElem, taskId);
                if (comment) {
                    let btnElems = await taskElem.findElements(By.xpath('.//button[text()="Оставить комментарий"]'));
                    if (btnElems.length !== 0) {

                        let bntComment = btnElems[0];
                        await config.scrollTo(this.driver, bntComment);
                        await config.sleep(500);
                        try {
                            await bntComment.click();
                        } catch(e) {
                            console.error(e, "Can't click Comment button");
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

            let isSwithed = await this.swithToTaskWindow();

            if (!isSwithed) {
                console.log("Can't switch window");
                await config.sleep(config.PAUSE.AFTER_FALSE_TASK);
                result = false;
            } else 
                result = await this.socialClicker.doAction(comment);
        
        }
    
        await this.closeTaskWindow();
        
        try {
            await this.driver.switchTo().window(this.mainWindow);
        } catch(e) {
            console.error(e, "Can't switch to main window");
        }  

        if (result === true || result === 'OK' || result === 'Already done') {

            await config.waitFor(this.driver, taskElem,
                By.xpath('.//*[contains(text(),"Проверка")]'),
                false, 30000,
                "Waiting for check failed"
            );

            let elems = await taskElem.findElements(By.xpath('.//*[contains(text(),"ВЫПОЛНЕНО")]'));
            if (elems && elems.length !== 0)
                console.log('Status: complete');
            else    
                console.log('Status: not complete');

            if (this.socialClicker.action === 'subscribe') {
                await config.sleep(config.PAUSE.BEFORE_UNSUBSCRIBE);
                await this.unsubscribe();
            }
        }

        if (this.socialClicker.action === 'comment') {
            this.dbLog.addTask(taskId, result);
        }    

        return result;

    }

    async unsubscribe(){
        
        //if (this.socialClicker.url.search(/akterka.ru/ !== -1)) return;

        await this.driver.executeScript(`window.open()`);
        console.log('unsubscribe: ' + this.socialClicker.url);

        let isSwithed = await this.swithToTaskWindow();
        if (isSwithed) {
            await this.driver.get(this.socialClicker.url);
            await this.socialClicker.unsubscribe();
        }
        
        await this.closeTaskWindow();
        await this.driver.switchTo().window(this.mainWindow);
    }

    async getComment(taskElem, taskId) {
        
        await config.waitFor(this.driver, taskElem,
            By.xpath('.//div[@class="form-group comment-place"]'),
            true, 1000,
            "Can't get comment"
        );

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
                if (config.isBlocked(comment)) {
                    console.log(`Blocked comment: ${comment}`);
                    return '';
                } else    
                    return comment;
            } catch(e) {
                console.error(e, "Can't get comment");
                return '';
            }    
        }

        return '';    
    
   }
}
