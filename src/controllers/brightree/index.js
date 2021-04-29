const {
  brightreeHandler,
  logHandler,
} = require('../../lib/handler');

exports.createPatientFromSalesforce = async (req, res) => {
  const payload = req.body;
  const responseData = {
    success: true,
  };
  try {
    responseData.data = await brightreeHandler.createPatientFromSalesforce(payload);
  } catch(error) {
    console.log('--- Error', error);
    responseData.success = false;
    responseData.data = error;
  }
  await logHandler.write({
    source: 'brightree.createPatientFromSalesforce',
    payload,
    content: responseData,
  });
  res.send(responseData);
};

exports.createReferralFromSalesforce = async (req, res) => {
  const payload = req.body;
  const responseData = {
    success: true,
  };
  try {
    responseData.data = await brightreeHandler.createReferralFromSalesforce(payload);
  } catch(error) {
    console.log('--- Error', error);
    responseData.success = false;
    responseData.data = error;
  }
  await logHandler.write({
    source: 'brightree.createReferralFromSalesforce',
    payload,
    content: responseData,
  });
  res.send(responseData);
};

exports.updateReferralWithRx = async (req, res) => {
  const payload = req.body;
  const responseData = {
    success: true,
  };
  try {
    responseData.data = await brightreeHandler.updateReferralWithRx(payload);
  } catch(error) {
    console.log('--- Error', error);
    responseData.success = false;
    responseData.data = error;
  }
  await logHandler.write({
    source: 'brightree.updateReferralWithRx',
    payload,
    content: responseData,
  });
  res.send(responseData);
};
