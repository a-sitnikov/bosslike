
class DBLog {

    constructor(db) {
        
        this.db = db;
        this.db.serialize(function() {
            let queryText = 'CREATE TABLE IF NOT EXISTS tasks (id integer, result INTEGER(1), date INTEGER, PRIMARY KEY (id));';      
            db.run(queryText);
        });

        this.insertTaskStmnt =  db.prepare("INSERT or REPLACE INTO tasks (id, result, date) VALUES (?, ?, ?)");
        this.taskStmnt       =  db.prepare("SELECT result, date FROM tasks WHERE id = ?");
    }

    
    addTask(taskId, result) {
        let date = new Date;
        this.insertTaskStmnt.run(taskId, result, date.getTime()/1000);       
    }
    
    getTaskParams(id) {
        return new Promise((resolve, rejected) => {
            this.taskStmnt.all(id, function(err, rows) {
                if (rows.length > 0) {
                    resolve(rows[0]);
                } else {
                    resolve(undefined);
                }
            });
        });

    }

    close() {
        this.insertTaskStmnt.finalize();
        this.taskStmnt.finalize();
        this.db.close();   
    }
}

module.exports = DBLog;