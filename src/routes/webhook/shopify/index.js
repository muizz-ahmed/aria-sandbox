var express = require('express');
var router = express.Router();

var shopify_controller = require('../../../controllers/webhook/shopify');

router.get('/', function(req, res, next) {
  res.send('webhook - shopify - respond with a resource');
});

router.post('/customer_creation', shopify_controller.customer_creation);
router.post('/order_creation', shopify_controller.order_creation);
router.post('/order_payment', shopify_controller.order_payment);
router.post('/order_update', shopify_controller.order_update);

module.exports = router;
