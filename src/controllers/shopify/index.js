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

exports.change_payment_method = async (req, res) => {
  const {
    customer_id = '',
    payment_method = '',
  } = req.body;

  try {
    if (!customer_id) throw 'No customer selected.';
    if (!payment_method) throw 'No payment method selected';
    const customer = await shopify.customer.get(customer_id);
    if (!customer) throw 'No customer found';
    const newTags = customer.tags.split(',').filter(tag => !tag.includes('PAY-'));
    newTags.push('PAY-' + payment_method.toUpperCase());
    await shopify.customer.update(customer_id, {
      tags: newTags.join(','),
    });
    res.send({
      success: true,
    });
  } catch(error) {
    res.send({
      success: false,
      error,
    });
  }
};

exports.push_trackings = async (req, res) => {
  const {
    customer_id = '',
    trackings = '',
  } = req.body;

  try {
    if (!customer_id) throw 'No customer selected.';
    if (!trackings) throw 'No trackings provided';

    const customer = await shopify.customer.get(customer_id);
    if (!customer) throw 'No customer found';

    await sfdcHandler.pushTrackings(customer.id, customer.tags, trackings);

    res.send({
      success: true,
    });
  } catch(error) {
    res.send({
      success: false,
      error,
    });
  }
};
