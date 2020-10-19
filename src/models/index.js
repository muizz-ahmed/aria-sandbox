const Sequelize = require('sequelize');

const LogModel = require('./log');

const {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
  MYSQL_LOGGING,
} = require('../lib/config');

const sequelize = new Sequelize(MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD, {
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  dialect: 'mysql',
  logging: MYSQL_LOGGING == "true" ? console.log : false,
});

const Log = LogModel(sequelize, Sequelize);

// sequelize.sync({ force: true })
//   .then(() => {
//     console.log(`Database & tables created!`);
//   });

module.exports = {
  Log,
  Operators: Sequelize.Op,
};
