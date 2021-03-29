var express = require('express');
var router = express.Router();
var brightree_controller = require('../../controllers/brightree');

router.get('/', function(req, res, next) {
  res.send('brightree - respond with a resource');
});

router.post('/createPatientFromSalesforce', brightree_controller.createPatientFromSalesforce);
router.post('/createOrderFromSalesforce', brightree_controller.createOrderFromSalesforce);

module.exports = router;
