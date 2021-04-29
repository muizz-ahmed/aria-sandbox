const {
  BRIGHTREE_USERNAME,
  BRIGHTREE_PASSWORD,
  BRIGHTREE_GRANT_TYPE,
  BRIGHTREE_CLIENT_ID,
  BRIGHTREE_CLIENT_SECRET,
} = require('./config');
const helper = require('./helper');
const configDB = require('./resources').db.config;

const soap = require('soap');

const request = require('request');
const querystring = require('querystring');
const {
  sfdcHandler,
} = require('./handler');

const moment = require('moment');

class BrightreeClient {
  constructor(args = {}) {
    this.params = {
      username: args.username || BRIGHTREE_USERNAME,
      password: args.password || BRIGHTREE_PASSWORD,
    };
    this.client = null;
  }
  createClient() {
    return new Promise(async (resolve, reject) => {
      soap.createClientAsync(this.wsdl_path, {
        wsdl_headers: {
          Authorization: `Basic ${Buffer.from(`${this.params.username}:${this.params.password}`).toString('base64')}`
        },
        disableCache: true,
      }).then(client => {
        client.setSecurity(new soap.BasicAuthSecurity(this.params.username, this.params.password));
        resolve(client);
      }).catch((e) => {
        reject(e)
      })
    });
  }
  apiCall(name, query) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.client) {
          this.client = await this.createClient();
        }
        resolve(await this.client[name + 'Async'](query));
      } catch(e) {
        reject(e);
      }
    })
  }
  getClient() {
    return this.client;
  }
}

class PatientService extends BrightreeClient {
  constructor() {
    super();
    this.wsdl_path = 'https://webservices.brightree.net/v0100-2006/OrderEntryService/patientservice.svc?singleWsdl';
    // this.wsdl_path = 'https://webservices.brightree.net/v0100-1302/OrderEntryService/patientservice.svc?singleWsdl';
  }
  PatientFetchByBrightreeID(brightreeID) {
    return new Promise(async (resolve, reject) => {
      try {
        const serviceResponse = await this.apiCall('PatientFetchByBrightreeID', {
          BrightreeID: brightreeID,
        });
        resolve(serviceResponse);
      } catch(e) {
        reject(e);
      }
    });
  }
  PatientCreate(patient) {
    return new Promise(async (resolve, reject) => {
      try {
        const serviceResponse = await this.apiCall('PatientCreate', {
          Patient: patient,
        });
        resolve(serviceResponse);
      } catch(e) {
        reject(e);
      }
    });
  }
  PatientUpdate(brightreeID, patient) {
    return new Promise(async (resolve, reject) => {
      try {
        const serviceResponse = await this.apiCall('PatientUpdate', {
          BrightreeID: brightreeID,
          Patient: patient,
        });
        resolve(serviceResponse);
      } catch(e) {
        reject(e);
      }
    });
  }
}

class brightreeHandler {
  constructor () {
    const statusHandler = require('./statusHandler')('brightree');
    this.getStatus = (arg = '') => statusHandler.getStatus(arg);
    this.setStatus = (arg) => statusHandler.setStatus(arg);
    this.updateStatus = (arg1, arg2) => statusHandler.updateStatus(arg1, arg2);
  }

  authenticate() {
    return new Promise(async (resolve, reject) => {
      try {
        const options = {
          method: 'POST',
          url: `https://integextapi.brightree.net/auth/token`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          form: {
            grant_type: BRIGHTREE_GRANT_TYPE,
            client_id: BRIGHTREE_CLIENT_ID,
            client_secret: BRIGHTREE_CLIENT_SECRET,
          },
        };
        const response = await helper.do_request(options);
        resolve(response.access_token);
      } catch(e) {
        reject(e);
      }
    });
  }

  get_auth_token(use_cache = true) {
    return new Promise(async (resolve, reject) => {
      try {
        const expire = configDB.get('brightree.auth.expire').value();
        let token = '';
        if (new Date(expire) <= new Date() || !use_cache) {
          token = await this.authenticate();
          configDB.set('brightree.auth', {
            token,
            expire: new Date(Date.now() + 1000 * 60 * 30) // 30 mins
          }).write();
        } else {
          token = configDB.get('brightree.auth.token').value();
        }
        resolve(token);
      } catch(e) {
        reject(e);
      }
    });
  }

  do_request(url, params = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const options = {
          method: 'GET',
          url: `https://integextapi.brightree.net${url}`,
          headers: {
            'Authorization': 'bearer ' + (await this.get_auth_token()),
            'Content-Type': 'application/json',
          },
          ...params
        };
        if (options.body) {
          options.json = true;
        }
        const response = await helper.do_request(options);
        resolve(response);
      } catch(e) {
        reject(e);
      }
    });
  }

  createPatientFromSalesforce(payload) {
    return new Promise(async (resolve, reject) => {
      try {
        resolve();
      } catch(e) {
        reject(e);
      }
    });
  }

  createReferralFromSalesforce(payload) {
    return new Promise(async (resolve, reject) => {
      try {

        const { order_id } = payload;
        const [
          order_response,
          orderItems_response,
          prescriptions_response,
        ] = await Promise.all([
          sfdcHandler.do_request('/services/data/v20.0/sobjects/Order/' + order_id),
          sfdcHandler.do_request('/services/data/v44.0/sobjects/Order/' + order_id + '/OrderItems'),
          sfdcHandler.do_request('/services/data/v44.0/sobjects/Order/' + order_id + '/Prescription_Collections__r'),
        ]);

        if (prescriptions_response.totalSize == 0) {
          return resolve('no prescriptions');
        }
        const prescriptions = prescriptions_response.records.filter(record => !record.Duplicate__c);
        if (prescriptions.length == 0) {
          return resolve('no prescriptions for this order/contact');
        }

        const contact_response = await sfdcHandler.do_request('/services/data/v20.0/sobjects/Contact/' + order_response.Contact__c);

        const referral_response = await this.do_request('/api/site/MontereyHealthAPI/referral', {
          method: 'POST',
          body: {
            "sendingFacility": {
              "name": "Dr Emily Iker",
              "externalID": "2002"
            },
            "receivingFacility": {
              "name": "Emilia Dewi",
              "externalID": "1001"
            },
            "patient": {
              "externalId": contact_response.Id,
              // "clinicalInfo": {
              //   "Diagnoses": [
              //     {
              //       "code": "G47.33",
              //       "codingMethod": "ICD10",
              //       "sequence": 1
              //     }
              //   ],
              //   "heightInches": 62,
              //   "weightPounds": 182,
              //   "orderingDoctor": {
              //     "npi": "1234567890",
              //     "name": {
              //       "first": "Test",
              //       "last": "Testing",
              //       "middle": "F",
              //       "suffix": "MD",
              //       "title": "Dr"
              //     }
              //   }
              // },
              "generalInfo": {
                "billingAddress": {
                  "addressLine1": contact_response.MailingStreet,
                  "city": contact_response.MailingCity,
                  "country": contact_response.MailingCountry,
                  "state": helper.getStateCode(contact_response.MailingState),
                  "zipCode": contact_response.MailingPostalCode
                },
                "deliveryAddress": {
                  "addressLine1": contact_response.OtherStreet,
                  "addressLine2": "",
                  "city": contact_response.OtherCity,
                  "country": contact_response.OtherCountry,
                  "state": helper.getStateCode(contact_response.OtherState),
                  "zipCode": contact_response.OtherPostalCode
                },
                "dob": moment(new Date(prescriptions[0].Patient_Date_of_Birth__c)).format('YYYYMMDD'),
                // "dod": "",
                "emailAddress": contact_response.Email,
                // "gender": "Male",
                "homePhone": contact_response.Phone,
                // "maritalStatus": "Single",
                "mobilePhone": contact_response.MobilePhone,
                "name": {
                  "title": contact_response.Title,
                  "first": contact_response.FirstName,
                  "last": contact_response.LastName,
                },
                // "ssn": null,
                // "emergencyContact": {
                //   "address": {
                //     "addressLine1": "100 Main Street",
                //     "addressLine2": "Apartment 101",
                //     "city": "Boston",
                //     "country": "USA",
                //     "state": "MA",
                //     "zipCode": "01001"
                //   },
                //   "emailAddress": "test1@test.com",
                //   "faxNumber": "1111111111",
                //   "homePhone": "2222222222",
                //   "mobilePhone": "3333333333",
                //   "name": {
                //     "first": "John",
                //     "last": "Doe",
                //     "middle": "E"
                //   },
                //   "relationship": "Friend"
                // },
                // "responsibleParty": {
                //   "address": {
                //     "addressLine1": "200 Main Street",
                //     "addressLine2": "Apartment 202",
                //     "city": "Boston",
                //     "country": "USA",
                //     "state": "MA",
                //     "zipCode": "01001"
                //   },
                //   "emailAddress": "test3@test.com",
                //   "faxNumber": "4444444444",
                //   "homePhone": "5555555555",
                //   "mobilePhone": "6666666666",
                //   "name": {
                //     "first": "Jane",
                //     "last": "Doe",
                //     "middle": "E"
                //   },
                //   "relationship": "Parent"
                // }
              },
              // "insuranceInfo": {
              //   "patientPayors": [
              //     {
              //       "payorLevel": 1,
              //       "expirationDate": null,
              //       "startDate": "20200301",
              //       "relationship": "Self",
              //       "policyNumber": "POL-0701-01",
              //       "insuranceId": 104,
              //       "externalPayorId": 104,
              //       "groupNumber": "GN-0701-01",
              //       "groupName": "GroupName-0701"
              //     }
              //   ]
              // },
              // "patientId": null
            },
            "salesOrder": {
              "externalId": order_response.Id,
            //   "note": "this is the contents of a sales order note",
              "submittedBy": {
                "title": contact_response.Title,
                "first": contact_response.FirstName,
                "last": contact_response.LastName,
              },
            //   "actualDeliveryDate": "20200710",
            //   "actualDeliveryTime": "16:00",
            //   "requestedDeliveryDate": "20200710",
            //   "requestedDeliveryTime": "15:30",
              "items": orderItems_response.records.map(lineItem => ({
                "externalId": lineItem.Id,
                "itemName": lineItem.Item_Name__c,
                "itemDescription": "",
                "itemId": lineItem.SKU__c,
                "note": "",
                "quantity": lineItem.Quantity,
              })),
            //   "orderingDoctor": {
            //     "orderingDoctor": {
            //       "npi": "1234567890",
            //       "name": {
            //         "first": "Test",
            //         "last": "Testing",
            //         "middle": "F",
            //         "suffix": "MD",
            //         "title": "Dr"
            //       }
            //     }
            //   }
            }
          }
        });

        // const response = await this.do_request('/api/site/MontereyHealthAPI/referral/' + 794467)

        // console.log(response)

        // return resolve(response)

        // const referral_response = {

        //     "Messages": [],
        //     "ReferralKey": 794485
        // }

        // let referral_details = null;
        // if (referral_response && referral_response.ReferralKey) {
        //   referral_details = await this.do_request(`/api/site/MontereyHealthAPI/referral/${referral_response.ReferralKey}/getreferralstatus`);
        // }

        await sfdcHandler.do_request('/services/data/v20.0/sobjects/Order/' + order_response.Id, {
          is_post: true,
          is_patch: true,
          data: {
            'BT_ReferralKey__c': referral_response.ReferralKey,
          },
        });
        // console.log(response);

        const response = {
          referral_response,
          // referral_details,
          order_response,
          contact_response,
          orderItems_response,
        };

        resolve(response);

        // const patientData = {
        //   ExternalID: contact_response.Id,
        //   PatientGeneralInfo: {
        //     CustomerType: 'Patient',
        //     Name: {
        //       First: contact_response.FirstName,
        //       Last: contact_response.LastName,
        //     },
        //     BillingContactInfo: {
        //       EmailAddress: contact_response.Email,
        //       PhoneNumber: contact_response.Phone,
        //       MobilePhoneNumber: contact_response.MobilePhone,
        //     },
        //     BillingAddress: {
        //       AddressLine1: contact_response.MailingStreet,
        //       City: contact_response.MailingCity,
        //       State: contact_response.MailingState,
        //       PostalCode: contact_response.MailingPostalCode,
        //       Country: contact_response.MailingCountry,
        //     },
        //     DeliveryAddress: {
        //       AddressLine1: contact_response.OtherStreet,
        //       City: contact_response.OtherCity,
        //       State: contact_response.OtherState,
        //       PostalCode: contact_response.OtherPostalCode,
        //       Country: contact_response.OtherCountry,
        //     },
        //     Branch: {
        //       // Key: 102,
        //       ID: 102,
        //       Value: 'Convoy Court',
        //     },
        //     // BranchKey: 102,
        //     // Branch: 102,
        //   },
        // };
        // console.log(patientData);

        // const bt = new PatientService();
        // let patientResponse = null;
        // patientResponse = await bt.PatientFetchByBrightreeID(36);
        // if (!contact_response.BT_Patient_ID__c) {
        //   patientResponse = await bt.PatientCreate(patientData);
        // } else {
        //   patientResponse = await bt.PatientUpdate(contact_response.BT_Patient_ID__c, patientData);
        // }

        // resolve({
        //   // patientResponse,
        //   // wsdl: bt.getClient().describe(),
        //   // order_response,
        //   // contact_response,
        // });

        // resolve(patient);
      } catch(e) {
        reject(e);
      }
    });
  }

  updateReferralWithRx(payload) {
    return new Promise(async (resolve, reject) => {
      try {
        const { order_id } = payload;
        const [
          order_response,
          prescriptions_response,
        ] = await Promise.all([
          sfdcHandler.do_request('/services/data/v20.0/sobjects/Order/' + order_id),
          sfdcHandler.do_request('/services/data/v44.0/sobjects/Order/' + order_id + '/Prescription_Collections__r'),
        ]);
        // const contact_response = await sfdcHandler.do_request('/services/data/v20.0/sobjects/Contact/' + order_response.Contact__c);

        if (prescriptions_response.totalSize == 0) {
          return resolve('no prescriptions');
        }
        const prescriptions = prescriptions_response.records.filter(record => !record.Duplicate__c);
        if (prescriptions.length == 0) {
          return resolve('no prescriptions for this order/contact');
        }

        const attachments_response = await sfdcHandler.getObjectRecords('Attachment', ['Id', 'Name', 'Body'], `WHERE ParentId='${prescriptions[0].Id}'`);

        const documents_response = await Promise.all(
          attachments_response.map(attachment => new Promise(async (resolve, reject) => {
            try {
              const content = await sfdcHandler.do_request(attachment.Body, {
                is_html: true,
              });
              await this.do_request('/api/site/MontereyHealthAPI/referral/' + order_response.BT_ReferralKey__c + '/document', {
                method: 'POST',
                body: {
                  "Id": attachment.Id,
                  "Content": Buffer.from(content, 'binary').toString('base64'),
                },
              });
              resolve({
                ...attachment,
                content,
              })
            } catch(e) {
              reject(e)
            }
          }))
        );

        const response = {
          order_response,
          // contact_response,
          prescriptions_response,
          // referral_response,
          attachments_response,
          documents_response,
        }
        resolve(response);
      } catch(e) {
        reject(e);
      }
    });
  }
};

module.exports = new brightreeHandler();
