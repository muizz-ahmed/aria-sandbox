var express = require('express');
var router = express.Router();
var salesforce_controller = require('../../controllers/salesforce');

router.get('/', function(req, res, next) {
  res.send('salesforce - respond with a resource');
});

router.get('/describe/:object', salesforce_controller.describe);

router.post('/createShopifyCustomerFromContact', salesforce_controller.createShopifyCustomerFromContact);
router.post('/createShopifyCustomerFromLead', salesforce_controller.createShopifyCustomerFromLead);
router.post('/fulfillShopifyOrderFromSalesforce', salesforce_controller.fulfillShopifyOrderFromSalesforce);

router.get('/sf_shopify_price_sync', salesforce_controller.sf_shopify_price_sync);
router.get('/get_lead_by_email', salesforce_controller.get_lead_by_email);

module.exports = router;
