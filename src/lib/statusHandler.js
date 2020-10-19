const deepmerge = require('deepmerge');
const {
  dbHandler,
} = require('./handler');

class statusHandler {
  constructor(key = '') {
    this.key = key || 'general';
  }

  getStatus (key = '') {
    return new Promise(async (resolve, reject) => {
      try {
        try {
          const [rows] = await dbHandler.execute(`
            SELECT
            content
            FROM status T
            WHERE T.key = ?
            LIMIT 1
          `, [ this.key ]);
          const content = JSON.parse(rows[0].content || '{}');
          return resolve(key ? (content[key] || {}) : content);
        } catch(e) {
          if (e.code == 'ER_ACCESS_DENIED_ERROR') {
            throw e;
          }
          await this.setStatus (key ? {[key]: {}} : {});
          resolve({});
        }
      } catch(e) {
        reject(e);
      };
    });
  }
  setStatus (status) {
    return new Promise(async (resolve, reject) => {
      try {
        await dbHandler.query('INSERT INTO status(`key`, `content`) VALUES (?) ON DUPLICATE KEY UPDATE `content`=VALUES(`content`)', [ [this.key, JSON.stringify(status)] ]);
        resolve();
      } catch(e) {
        reject(e);
      }
    });
  }
  updateStatus (key, content) {
    return new Promise(async (resolve, reject) => {
      try {
        const status = deepmerge( await this.getStatus(), { [key]: content }, { arrayMerge: (destinationArray, sourceArray, options) => sourceArray } );
        await dbHandler.execute(`
          UPDATE status T SET
          content = ?
          WHERE T.key = ?
        `, [ JSON.stringify(status), this.key ]);
        resolve();
      } catch(e) {
        reject(e);
      }
    });
  }
}

module.exports = (key) => new statusHandler(key);
