const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const config = low(new FileSync('db/config.json'));
config.defaults({
  sfdc: {
    token: ''
  }
}).write();

const sfdc = low(new FileSync('db/sfdc.json'));
sfdc.defaults({
}).write();

module.exports = {
  db: {
    config,
    sfdc,
  },
};
