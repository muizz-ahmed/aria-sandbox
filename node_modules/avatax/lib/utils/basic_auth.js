'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createBasicAuthHeader = createBasicAuthHeader;
/**
 * Avalara © 2017
 * file: lib/utils/basic_auth.js
 */

function createBasicAuthHeader(account, licenseKey) {
  var base64Encoded = new Buffer(account + ':' + licenseKey).toString('base64');
  return 'Basic ' + base64Encoded;
}