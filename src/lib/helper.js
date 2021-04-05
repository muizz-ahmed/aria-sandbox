const request = require('request');
const xml2js = require('xml2js');
const requestDB = require('./resources').db.request;

const fullStatesName = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
};
const states_hash = {
  'Alabama': 'AL', 'Alaska': 'AK', 'American Samoa': 'AS', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'District Of Columbia': 'DC', 'Federated States Of Micronesia': 'FM', 'Florida': 'FL', 'Georgia': 'GA', 'Guam': 'GU', 'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Marshall Islands': 'MH', 'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Northern Mariana Islands': 'MP', 'Ohio': 'OH', 'Oklahoma': 'OK', 'Oregon': 'OR', 'Palau': 'PW', 'Pennsylvania': 'PA', 'Puerto Rico': 'PR', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT', 'Virgin Islands': 'VI', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};
exports.getFullStateName = (state) => {
  return fullStatesName[state];
};
exports.getStateCode = (state) => {
  return (states_hash[state] || state || '').toUpperCase();
};

const nexusList = [
  "CA",
  "CO",
  "FL",
  "GA",
  "IL",
  "IN",
  "KY",
  "LA",
  "MD",
  "MA",
  "MI",
  "NJ",
  "NY",
  "NC",
  "PA",
  "SC",
  "TN",
  "TX",
  "VT",
  "WI",
  "WV",
];
exports.isInNexus = (state) => {
  let state_code = (states_hash[state] || state || '').toUpperCase();
  return nexusList.includes(state_code);
};

exports.getDaysInMonth = (month, year) => {
  return new Date(year, month, 0).getDate();
};

exports.getDate = (t = new Date()) => {
  var year = t.getFullYear();
  var month = "0" + (t.getMonth() + 1);
  var day = "0" + t.getDate();
  return `${year}-${month.substr(-2)}-${day.substr(-2)}`;
}

exports.getDateTime = (t = new Date()) => {
  var year = t.getFullYear();
  var month = "0" + (t.getMonth() + 1);
  var day = "0" + t.getDate();
  var hours = "0" + t.getHours();
  var minutes = "0" + t.getMinutes();
  var seconds = "0" + t.getSeconds();
  return `${year}-${month.substr(-2)}-${day.substr(-2)} ${hours.substr(-2)}:${minutes.substr(-2)}:${seconds.substr(-2)}`;
};

exports.parseXML = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      resolve(await xml2js.parseStringPromise(data));
    } catch(e) {
      console.log('Parse xml failed', e, data);
      reject(e);
    }
  });
};

const do_request = (options) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (options.cache) {
        let cached_data = null;
        const expire = requestDB.get(`${options.cache.key}.expire`).value();
        // console.log(`"${options.cache.key}" cached expire`, expire);
        if (!expire || new Date(expire) <= new Date()) {
          // console.log('trying to refresh cache');
          cached_data = await do_request({
            ...options,
            cache: undefined,
          });
          requestDB.set(`${options.cache.key}`, {
            data: cached_data,
            expire: new Date(Date.now() + 1000 * (options.cache.expire || 3600)) // options.cache.expire: number of seconds. default an hour
          }).write();
        } else {
          // console.log('get from cached_data');
          cached_data = requestDB.get(`${options.cache.key}.data`).value();
        }
        return resolve(cached_data);
      }
      request(options, async function(error, response, body) {
        if (error) {
          return reject(error);
        }
        try {
          if (options.is_raw) {
            return resolve(body);
          }
          if (options.is_xml) {
            return resolve(await xml2js.parseStringPromise(body));
          }
          if (options.json) {
            return resolve(body);
          }
          return resolve(JSON.parse(body));
        } catch(e) {
          console.log('Request body parse error', e, body);
          return reject(e);
        }
      });
    } catch(e) {
      reject(e);
    }
  });
};
exports.do_request = do_request;

exports.getSafe = (fn, defaultVal) => {
  try {
    return fn();
  } catch (e) {
    return defaultVal;
  }
};
