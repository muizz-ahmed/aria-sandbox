var express = require('express');
var router = express.Router();
var checkout_controller = require('../../controllers/shopify/checkout');

router.get('/', function(req, res, next) {
  res.send('shopify - checkout - respond with a resource');
});

module.exports = router;
