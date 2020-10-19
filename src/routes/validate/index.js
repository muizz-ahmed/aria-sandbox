var express = require('express');
var router = express.Router();
var validate_controller = require('../../controllers/validate');

router.get('/', function(req, res, next) {
  res.send('validate - respond with a resource');
});

module.exports = router;
