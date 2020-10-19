const {
  SHOPIFY_STORE_NAME,
  SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET,
} = require('../../lib/config');
const Shopify = require('shopify-api-node');
const shopify = new Shopify({
  shopName: SHOPIFY_STORE_NAME,
  apiKey: SHOPIFY_API_KEY,
  password: SHOPIFY_API_SECRET,
  apiVersion: '2020-04',
});
const request = require('request');
const {
  sfdcHandler,
} = require('../../lib/handler');

const replaceAll = (search, replacement, target) => {
  return target.replace(new RegExp(search, 'g'), replacement);
};
