var express = require('express');
var router = express.Router();
var statusHandler = require('../../lib/statusHandler');

router.get('/', async function(req, res, next) {
  res.send(await statusHandler().getStatus());
});

router.get('/:key', async function(req, res, next) {
  res.send(await statusHandler(req.params.key).getStatus());
});

module.exports = router;
