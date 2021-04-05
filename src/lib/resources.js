const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const config = low(new FileSync('db/config.json'));
config.defaults({
  sfdc: {
    token: ''
  },
  brightree: {
    auth: {
      token: '',
      expire: new Date(),
    },
  },
}).write();

const sfdc = low(new FileSync('db/sfdc.json'));
sfdc.defaults({
}).write();

const request = low(new FileSync('db/request.json'));
request.defaults({
}).write();

module.exports = {
  db: {
    config,
    sfdc,
    request,
  },
};
