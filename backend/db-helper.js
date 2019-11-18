const sqlite3 = require('sqlite3')
const Promise = require('bluebird')

class DBHelper {
  constructor() {
    this.db = new sqlite3.Database('./db-storage/ds.db', (err) => {
      if (err) {
        console.log('Could not connect to database', err)
      } else {
        console.log('Connected to database');
        this.createTables();
      }
    })
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          console.log('Error running sql ' + sql)
          console.log(err)
          reject(err)
        } else {
          resolve({ id: this.lastID })
        }
      })
    })
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, result) => {
        if (err) {
          console.log('Error running sql: ' + sql)
          console.log(err)
          reject(err)
        } else {
          resolve(result)
        }
      })
    })
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.log('Error running sql: ' + sql)
          console.log(err)
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })
  }

  createTables(){
      console.log("Creating required tables...");
      this.run(`CREATE TABLE IF NOT EXISTS OWNER (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        USERNAME TEXT, 
        PASSWORD TEXT,
        FISRT_PHONE TEXT,
        SECOND_PHONE TEXT)`);

    
      
      this.run(`CREATE TABLE IF NOT EXISTS DEVICE (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        USER_ID INTEGER, 
        DEVICE_UUID TEXT,
        DEVICE_MAC TEXT,
        METADATA TEXT)`);

      this.run(`CREATE TABLE IF NOT EXISTS MEDICINE (
          ID INTEGER PRIMARY KEY AUTOINCREMENT,
          USER_ID INTEGER, 
          DEVICE_ID TEXT,
          HOUR INTEGER,
          MESSAGE TEXT,
          QTY INTEGER,
          FREQ TEXT)`);
      
      this.run(`CREATE TABLE IF NOT EXISTS ACTIVITY (
            ID INTEGER PRIMARY KEY AUTOINCREMENT,
            USER_ID INTEGER, 
            DEVICE_ID TEXT,
            TYPE TEXT,
            MESSAGE TEXT,
            TS INTEGER,
            LEVEL INTEGER,
            ACK TEXT)`);
      console.log("Tables are created...");
  }

}

module.exports = DBHelper