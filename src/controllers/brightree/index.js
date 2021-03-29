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

exports.createOrderFromSalesforce = async (req, res) => {
  const payload = req.body;
  const responseData = {
    success: true,
  };
  try {
    responseData.data = await brightreeHandler.createOrderFromSalesforce(payload);
  } catch(error) {
    console.log('--- Error', error);
    responseData.success = false;
    responseData.data = error;
  }
  await logHandler.write({
    source: 'brightree.createOrderFromSalesforce',
    payload,
    content: responseData,
  });
  res.send(responseData);
};
