const sfdcDB = require('../../lib/resources').db.sfdc;
const {
  sfdcHandler,
} = require('../../lib/handler');

exports.describe = async (req, res) => {
  try {
    const {
      object,
    } = req.params;
    if (!object) throw 'Object name is missing';
    res.send({
      success: true,
      data: await sfdcHandler.describe(object)
    });
  } catch(error) {
    console.log('--- Error from describe controller', error);
    res.send({
      success: false,
      error
    });
  }
};

exports.createShopifyCustomerFromContact = async (req, res) => {
  try {
    const {
      contact_id = '',
    } = req.body;
    if (!contact_id) throw 'Contact ID is missing';
    await sfdcHandler.createShopifyCustomerFromContact(contact_id);
    res.send({
      success: true,
    });
  } catch(error) {
    console.log('--- Error from createShopifyCustomerFromContact controller', error);
    res.send({
      success: false,
      error,
    });
  }
};

exports.createShopifyCustomerFromLead = async (req, res) => {
  try {
    const {
      lead_id = '',
    } = req.body;
    if (!lead_id) throw 'Lead ID is missing';
    await sfdcHandler.createShopifyCustomerFromLead(lead_id);
    res.send({
      success: true,
    });
  } catch(error) {
    console.log('--- Error from createShopifyCustomerFromLead controller', error);
    res.send({
      success: false,
      error,
    });
  }
};

exports.fulfillShopifyOrderFromSalesforce = async (req, res) => {
  try {
    const {
      order_id = '',
    } = req.body;
    if (!order_id) throw 'Order ID is missing';
    await sfdcHandler.fulfillShopifyOrderFromSalesforce(order_id);
    res.send({
      success: true,
    });
  } catch(error) {
    console.log('--- Error from fulfillShopifyOrderFromSalesforce controller', error);
    res.send({
      success: false,
      error,
    });
  }
};

exports.sf_shopify_price_sync = async (req, res) => {
  try {
    const data = await sfdcHandler.sf_shopify_price_sync();
    res.send({
      success: true,
      data,
    });
  } catch(error) {
    console.log('--- Error from sf_shopify_price_sync controller', error);
    res.send({
      success: false,
      error,
    });
  }
};

exports.get_lead_by_email = async (req, res) => {
  try {
    const {
      email = '',
    } = req.query;
    const data = await sfdcHandler.get_lead_by_email(email);
    res.send({
      success: true,
      valid: !(data && data.ConvertedContactId),
    });
  } catch(error) {
    console.log('--- Error from sf_shopify_price_sync controller', error);
    res.send({
      success: false,
      error,
    });
  }
};
