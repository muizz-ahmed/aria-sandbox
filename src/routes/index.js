var express = require('express');
var router = express.Router();

const {
  sfdcHandler,
  avalaraHandler,
  reportsHandler,
  shopifyHandler,
  cronHandler,
} = require('../lib/handler');

const {
  validateToken,
} = require('../middleware');

var unless = function(path, middleware) {
  return function(req, res, next) {
    if (Array.isArray(path) && path.some(p => req.path.startsWith(p)) || req.path.startsWith(path)) {
      return next();
    } else {
      return middleware(req, res, next);
    }
  };
};

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Aria API' });
});

router.use(function (req, res, next) {
  if (req.query.sandbox && req.query.sandbox == 'true') {
    sfdcHandler.runSandbox();
  } else {
    sfdcHandler.runProduction();
  }
  next();
});

router.get('/test', async (req, res) => {
  let responseData = {
    success: true,
  };
  try {
    responseData.data = await (() => new Promise(async (resolve, reject) => {
      try {
        resolve();
      } catch(e) {
        console.log(e)
        reject(e)
      }
    }))()
  } catch(e) {
    console.log(e);
    responseData.success = false;
    responseData.error = e;
  }
  res.send(responseData);
});

router.use('/salesforce', require('./salesforce'));
router.use('/shopify', require('./shopify'));
router.use('/brightree', require('./brightree'));

router.use('/validate', require('./validate'));
router.use('/webhook', require('./webhook'));

router.use('/status', require('./status'));

module.exports = router;

cronHandler.run();
