const {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
} = require('./config');

// get the client
const mysql = require('mysql2/promise');

class dbHandler {
  constructor () {
    // Create the connection pool. The pool-specific settings are the defaults
    this.pool = mysql.createPool({
      host: MYSQL_HOST,
      port: MYSQL_PORT,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // this.poolPromise = this.pool.promise();
    this.poolPromise = this.pool;

    const that = this;
    [
      'query',
      'execute',
    ].forEach(name => {
      this[name] = function() {
        return new Promise(async (resolve, reject) => {
          try {
            resolve(that.poolPromise[name].apply(that.poolPromise, arguments));
          } catch(e) {
            reject(e);
          }
        })
      }
    });
  }

  batchRun (callback_to_batch) {
    return new Promise(async (resolve, reject) => {
      const connection = await this.poolPromise.getConnection();
      await connection.beginTransaction();
      try {
        await callback_to_batch(connection);
        await connection.commit();
        resolve();
      } catch(e) {
        await connection.rollback();
        reject(e);
      } finally {
        connection.release();
      }
    });
  }
};

module.exports = new dbHandler();
