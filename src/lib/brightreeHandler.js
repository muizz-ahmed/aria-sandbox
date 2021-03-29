const {
  BRIGHTREE_USERNAME,
  BRIGHTREE_PASSWORD,
} = require('./config');
const helper = require('./helper');

const soap = require('soap');

const request = require('request');
const querystring = require('querystring');
const {
  sfdcHandler,
} = require('./handler');

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

  createPatientFromSalesforce(payload) {
    return new Promise(async (resolve, reject) => {
      try {
        resolve();
      } catch(e) {
        reject(e);
      }
    });
  }

  createOrderFromSalesforce(payload) {
    return new Promise(async (resolve, reject) => {
      try {

        const { order_id } = payload;
        const order_response = await sfdcHandler.do_request('/services/data/v20.0/sobjects/Order/Shopify_Order_ID__c/' + order_id);
        const contact_response = await sfdcHandler.do_request('/services/data/v20.0/sobjects/Contact/' + order_response.Contact__c);



        const patientData = {
          ExternalID: contact_response.Id,
          PatientGeneralInfo: {
            CustomerType: 'Patient',
            Name: {
              First: contact_response.FirstName,
              Last: contact_response.LastName,
            },
            BillingContactInfo: {
              EmailAddress: contact_response.Email,
              PhoneNumber: contact_response.Phone,
              MobilePhoneNumber: contact_response.MobilePhone,
            },
            BillingAddress: {
              AddressLine1: contact_response.MailingStreet,
              City: contact_response.MailingCity,
              State: contact_response.MailingState,
              PostalCode: contact_response.MailingPostalCode,
              Country: contact_response.MailingCountry,
            },
            DeliveryAddress: {
              AddressLine1: contact_response.OtherStreet,
              City: contact_response.OtherCity,
              State: contact_response.OtherState,
              PostalCode: contact_response.OtherPostalCode,
              Country: contact_response.OtherCountry,
            },
            Branch: {
              // Key: 102,
              ID: 102,
              Value: 'Convoy Court',
            },
            // BranchKey: 102,
            // Branch: 102,
          },
        };

        console.log(patientData);

        const bt = new PatientService();

        let patientResponse = null;
        
        patientResponse = await bt.PatientFetchByBrightreeID(36);

        // if (!contact_response.BT_Patient_ID__c) {

        //   patientResponse = await bt.PatientCreate(patientData);

        // } else {
        //   patientResponse = await bt.PatientUpdate(contact_response.BT_Patient_ID__c, patientData);
        // }

        resolve({
          patientResponse,
          wsdl: bt.getClient().describe(),
          order_response,
          contact_response,

        });

        // resolve(patient);
      } catch(e) {
        reject(e);
      }
    });
  }

};

module.exports = new brightreeHandler();
