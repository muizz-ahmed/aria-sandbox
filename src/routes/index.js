var express = require('express');
var jwt = require('jsonwebtoken');
var router = express.Router();

const {
  brightreeHandler,
  sfdcHandler,
  avalaraHandler,
  reportsHandler,
  logHandler,
  cronHandler,
} = require('../lib/handler');

const {
  AUTH_SECRET,
  AUTH_TOKEN_LIFE,
} = require('../lib/config');

const {
  validateToken,
} = require('../middleware');

const helper = require('../lib/helper');

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

router.post('/auth/token', async (req, res) => {
  res.send({
    access_token: jwt.sign({ source: 'brightree' }, AUTH_SECRET, { expiresIn: +AUTH_TOKEN_LIFE }),
    token_type: 'bearer',
    expires_in: AUTH_TOKEN_LIFE,
  });
});

router.post('/api/site/:sitenickname/referral/:referralid/updatestatus', async (req, res) => {
  const responseData = {
    success: true,
  };
  try {
    responseData.data = await brightreeHandler.handleReferralStatusUpdated(req.params, req.body);
  } catch(e) {
    console.log(e);
    responseData.success = false;
    responseData.error = e;
  }
  await logHandler.write({
    source: 'brightree.referral.updatestatus',
    payload: {
      params: req.params,
      payload: req.body,
    },
    content: responseData,
  });
  res.status(204).send();
});

router.get('/load', async (req, res) => {
  let responseData = {
    success: true,
  };
  try {
    responseData.data = await (() => new Promise(async (resolve, reject) => {
      try {
        const response = await helper.do_request({
          url: req.query.url,
          is_raw: true,
        });
        resolve(response);
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
