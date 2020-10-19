var express = require('express');
var router = express.Router();
var shopify_controller = require('../../controllers/shopify');

router.get('/', function(req, res, next) {
  res.send('shopify - respond with a resource');
});

router.post('/change_payment_method', shopify_controller.change_payment_method);

router.post('/push_trackings', shopify_controller.push_trackings);

router.use('/checkout', require('./checkout'));

module.exports = router;
