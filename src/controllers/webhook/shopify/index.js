const {
  sfdcHandler,
  logHandler,
} = require('../../../lib/handler');

exports.customer_creation = async (req, res) => {
  const payload = req.body;
  const responseData = {
    success: true,
  };
  try {
    // responseData.data = await sfdcHandler.handle_shopify_customerCreation(payload);
  } catch(error) {
    console.log('--- Error', error);
    responseData.success = false;
    responseData.data = error;
  }
  await logHandler.write({
    source: 'webhook.shopify.customer_creation',
    payload,
    content: responseData,
  });
  res.status(204).send();
};

exports.order_creation = async (req, res) => {
  const payload = req.body;
  const responseData = {
    success: true,
  };
  try {
    responseData.data = await sfdcHandler.handle_shopify_orderCreation(payload);
  } catch(error) {
    console.log('--- Error', error);
    responseData.success = false;
    responseData.data = error;
  }
  await logHandler.write({
    source: 'webhook.shopify.order_creation',
    payload,
    content: responseData,
  });
  if (!responseData.success) {
    return res.status(500).send();
  }
  res.status(204).send();
};

exports.order_payment = async (req, res) => {
  const payload = req.body;
  const responseData = {
    success: true,
  };
  try {
    responseData.data = await sfdcHandler.handle_shopify_orderPayment(payload);
  } catch(error) {
    console.log('--- Error', error);
    responseData.success = false;
    responseData.data = error;
  }
  await logHandler.write({
    source: 'webhook.shopify.order_payment',
    payload,
    content: responseData,
  });
  if (!responseData.success) {
    return res.status(500).send();
  }
  res.status(204).send();
};

exports.order_update = async (req, res) => {
  const payload = req.body;
  const responseData = {
    success: true,
  };
  try {
    responseData.data = await sfdcHandler.handle_shopify_orderUpdate(payload);
  } catch(error) {
    console.log('--- Error', error);
    responseData.success = false;
    responseData.data = error;
  }
  await logHandler.write({
    source: 'webhook.shopify.order_update',
    payload,
    content: responseData,
  });
  if (!responseData.success) {
    return res.status(500).send();
  }
  res.status(204).send();
};
