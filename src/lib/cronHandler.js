var cron = require('node-cron');
const createError = require('http-errors');
const {
  dbHandler,
  sfdcHandler,
} = require('./handler');
const { NODE_ENV } = require('./config');
const {
  Store,
  Backup,
  Operators,
} = require('../models');


class cronHandler {
  constructor () {
    this.tasks = [
      {
        name: 'price_sync',
        schedule: '0 * * * *',
        method: 'sf_shopify_price_sync',
      },
    ];
    this.instances = [];
  }

  getRandomInt (max) {
    return Math.floor(Math.random() * Math.floor(max))
  }
  sleep (seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }
  sleepForRandomSeconds () {
    return this.sleep(this.getRandomInt(30));
  }

  sf_shopify_price_sync () {
    return async () => {
      await this.sleepForRandomSeconds();
      try {
        const response = await sfdcHandler.sf_shopify_price_sync();
        console.log('Cron : sfdcHandler.sf_shopify_price_sync - ', response);
      } catch(e) {
        console.log('Error from crontab - sfdcHandler.sf_shopify_price_sync - ', e);
      }
    };
  }

  run () {
    if (NODE_ENV == 'development') {
      console.log('Ignore setting up Cron Jobs - development env');
      return;
    }

    this.tasks.forEach((task) => {
      if (task.schedule) {
        this.instances.push({
          ...task,
          taskID: `task:${task.name}`,
          cronInstance: cron.schedule(task.schedule, (this[task.method])()),
        });
        if (task.callback) {
          (this[task.callback])();
        }
      }
    });
  }
};

module.exports = new cronHandler();
