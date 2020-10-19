const {
  Log,
} = require('../models');

class logHandler {
  constructor () {
  }

  write ({
    source = '',
    payload = {},
    content = {},
    status = '',
  }) {
    return new Promise(async (resolve, reject) => {
      try {
        const logEntry = await Log.create({
          source,
          payload: JSON.stringify(payload),
          content: JSON.stringify(content),
          status: status || (content.success ? 'success' : 'error'),
        });
        resolve({
          success: true,
          data: {
            id: logEntry.id,
          },
        })
      } catch(error) {
        console.log(error);
        reject({
          success: false,
          error,
        });
      }
    });
  }
};

module.exports = new logHandler();
