const {
  GOOGLE_MAP_KEY,
} = require('../../lib/config');
var request = require('request');
const helper = require('../../lib/helper');

exports.npi = (req, res) => {
  const { npi = '' } = req.body;
  if (npi.length != 10) {
    return res.send({
      success: false,
      error: 'Invalid NPI input'
    });
  }

  const npiPromise = new Promise((resolve, reject) => {
    const url = 'https://npiregistry.cms.hhs.gov/api/?number=' + npi + '&enumeration_type=&taxonomy_description=&first_name=&last_name=&organization_name=&address_purpose=&city=&state=&postal_code=&country_code=&limit=&skip=&version=2.0';
    request(url, (err, response, bodyString) => {
      if (err) {
        return reject(err);
      }
      try {
        const body = (typeof bodyString == 'string' && bodyString) ? JSON.parse(bodyString) : bodyString;
        if (!body.result_count) {
          throw 'No matching organization with NPI - ' + npi;
        }
        if (body.results[0].enumeration_type != 'NPI-2') {
          throw 'No organization';
        }
        resolve(body);
      } catch(e) {
        return reject(e);
      }
    });
  });

  npiPromise.then((data) => {
    return res.send({
      success: true,
      data
    });
  }).catch((error) => {
    return res.send({
      success: false,
      error
    });
  });
};

exports.address = async (req, res) => {
  const {
    street = '',
    city = '',
    state = '',
    postal = '00000',
  } = req.body;
  if (street && city && state && postal) {
    const addressPromise = new Promise((resolve, reject) => {
      let formatted = street + ', ' + city + ', ' + helper.getStateCode(state) + ' ' + postal;
      request.get({
        url: 'https://maps.google.com/maps/api/geocode/json?address=' + encodeURIComponent(formatted) + '&sensor=false&key=' + GOOGLE_MAP_KEY
      }, (error, response, bodyString) => {
        if (error) {
          return resolve('bad');
        }
        let body = null;
        try {
          body = JSON.parse(bodyString);
          if (body.results.some((result) => result.formatted_address.toLowerCase().includes(formatted.toLowerCase()))) {
            return resolve('good');
          } else {
            throw 'Different formatted address';
          }
        } catch(e) {
          console.log(e, formatted, bodyString);
          return resolve('bad');
        }
      })
    });
    try {
      const status = await addressPromise;
      return res.send(status);
    } catch(e) {
      return res.send('bad');
    }
  } else {
    return res.send('bad');
  }
};
