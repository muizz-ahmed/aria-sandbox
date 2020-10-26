const {
  SALESFORCE_SANDBOX_CLIENT_ID,
  SALESFORCE_SANDBOX_CLIENT_SECRET,
  SALESFORCE_SANDBOX_USERNAME,
  SALESFORCE_SANDBOX_PASSWORD,
  SALESFORCE_SANDBOX_SECRET_TOKEN,
  SALESFORCE_SANDBOX_BASE_URL,
  SALESFORCE_SANDBOX_AUTH_URL,
  SALESFORCE_CLIENT_ID,
  SALESFORCE_CLIENT_SECRET,
  SALESFORCE_USERNAME,
  SALESFORCE_PASSWORD,
  SALESFORCE_SECRET_TOKEN,
  SALESFORCE_BASE_URL,
  SALESFORCE_AUTH_URL,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_KEY,
  GOOGLE_MAP_KEY,
  SHOPIFY_STORE_NAME,
  SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET,
  PARTIALLY_API_KEY,
  SHOPIFY_CUSTOMER_CREDS,
} = require('./config');
const request = require('request');
const AWS = require('aws-sdk');
const configDB = require('./resources').db.config;
const helper = require('./helper');
const Shopify = require('shopify-api-node');
const shopify = new Shopify({
  shopName: SHOPIFY_STORE_NAME,
  apiKey: SHOPIFY_API_KEY,
  password: SHOPIFY_API_SECRET,
  apiVersion: '2020-04',
});
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

class sfdcHandler {
  constructor () {
    this.sandbox = false;
    this.envVars = {
      sandbox: {
        SALESFORCE_CLIENT_ID: SALESFORCE_SANDBOX_CLIENT_ID,
        SALESFORCE_CLIENT_SECRET: SALESFORCE_SANDBOX_CLIENT_SECRET,
        SALESFORCE_USERNAME: SALESFORCE_SANDBOX_USERNAME,
        SALESFORCE_PASSWORD: SALESFORCE_SANDBOX_PASSWORD,
        SALESFORCE_SECRET_TOKEN: SALESFORCE_SANDBOX_SECRET_TOKEN,
        SALESFORCE_BASE_URL: SALESFORCE_SANDBOX_BASE_URL,
        SALESFORCE_AUTH_URL: SALESFORCE_SANDBOX_AUTH_URL,
      },
      production: {
        SALESFORCE_CLIENT_ID: SALESFORCE_CLIENT_ID,
        SALESFORCE_CLIENT_SECRET: SALESFORCE_CLIENT_SECRET,
        SALESFORCE_USERNAME: SALESFORCE_USERNAME,
        SALESFORCE_PASSWORD: SALESFORCE_PASSWORD,
        SALESFORCE_SECRET_TOKEN: SALESFORCE_SECRET_TOKEN,
        SALESFORCE_BASE_URL: SALESFORCE_BASE_URL,
        SALESFORCE_AUTH_URL: SALESFORCE_AUTH_URL,
      }
    }
    this.env = this.envVars.production;
    this.auth_failed = 0;

    const statusHandler = require('./statusHandler')('sfdc');
    this.getStatus = (arg = '') => statusHandler.getStatus(arg);
    this.setStatus = (arg) => statusHandler.setStatus(arg);
    this.updateStatus = (arg1, arg2) => statusHandler.updateStatus(arg1, arg2);
  }

  runSandbox () {
    this.sandbox = true;
    this.updateEnv();
  }
  runProduction () {
    this.sandbox = false;
    this.updateEnv();
  }

  updateEnv () {
    this.env = this.sandbox ? this.envVars.sandbox : this.envVars.production;
  }

  async do_request (url, params = {}) {
    if (this.sandbox) {
      console.log('--- running on sandbox');
    }

    const options = {
      method: 'GET',
      uri: url,
      headers: {}
    };
    if (params.is_post) {
      options.method = 'POST';
    }
    if (params.is_patch) {
      options.method = 'PATCH';
    }
    if (params.is_delete) {
      options.method = 'DELETE';
    }
    if (params.data) {
      if (Array.isArray(params.data)) {
        options.form = params.data.join('&');
      } else {
        options.body = JSON.stringify(params.data);
        options.headers['Content-Type'] = 'application/json';
      }
    }
    if (!params.is_auth) {
      options.uri = this.env.SALESFORCE_BASE_URL + (url || '');
      options.headers['Authorization'] = 'Bearer ' + (await this.get_auth_token());
      options.headers['X-PrettyPrint'] = '1';
    }

    return new Promise((resolve, reject) => {
      // console.log(options);
      request(options, async (err, response, bodyString) => {
        // console.log(err, response, bodyString);
        if (err) {
          // console.log('--- error from api', err);
          return reject(err);
        }
        try {
          // console.log('--- response from api', bodyString);
          const body = (typeof bodyString == 'string' && bodyString) ? JSON.parse(bodyString) : bodyString;
          if (Array.isArray(body) && body[0]['errorCode']) {
            if (body[0]['errorCode']) { // NOT_FOUND, INVALID_SESSION_ID
              // console.log(body[0]);
              if (body[0]['errorCode'] == 'INVALID_SESSION_ID') {
                this.auth_failed++;
                console.log('--- Caught Auth Exception', this.auth_failed + ' times');
                if (this.auth_failed > 3) {
                  throw body[0];
                }
              } else {
                throw body[0];
              }
            }
            return resolve(await this.do_request(url, {...params, token: await this.get_auth_token()}));
          } else {
            return resolve(body);
          }
        } catch(e) {
          if (e instanceof SyntaxError && params.is_html) {
            return resolve(bodyString);
          }
          reject(e);
        }
      });
    });
  }

  do_authenticate () {
    return this.do_request(this.env.SALESFORCE_AUTH_URL, {
      is_auth: true,
      is_post: true,
      data: [
        'grant_type=password',
        'client_id=' + encodeURIComponent(this.env.SALESFORCE_CLIENT_ID),
        'client_secret=' + encodeURIComponent(this.env.SALESFORCE_CLIENT_SECRET),
        'username=' + encodeURIComponent(this.env.SALESFORCE_USERNAME),
        'password=' + encodeURIComponent(this.env.SALESFORCE_PASSWORD + this.env.SALESFORCE_SECRET_TOKEN),
      ]
    });
  }

  get_auth_token () {
    return new Promise(async (resolve, reject) => {
      let tokenPath = 'sfdc.token';
      if (this.sandbox) {
        tokenPath = 'sfdc.sandbox.token';
      }
      if (this.auth_failed == 0) {
        let token = configDB.get(tokenPath).value();
        if (token) {
          // console.log('--- returning db token');
          return resolve(token);
        }
      }
      try {
        const auth_response = await this.do_authenticate();
        if (auth_response.error || !auth_response.access_token) {
          throw auth_response;
        }
        const {
          access_token
        } = auth_response;
        configDB.set(tokenPath, access_token).write();
        // console.log('--- returning sf token');
        this.auth_failed = 0;
        return resolve(access_token);
      } catch(e) {
        reject(e);
      }
    });
  }

  describe (object) {
    return new Promise(async (resolve, reject) => {
      try {
        let url = `/services/data/v20.0/sobjects/${object}/describe`;
        resolve(await this.do_request(url));
      } catch(e) {
        reject(e);
      }
    });
  }

  getObjectRecords (obj_name = '', obj_fields = ['Id'], ext_query = '', callback = null) {
    return new Promise(async (resolve, reject) => {
      try {
        const list = [];
        const queryParams = [
          'SELECT',
          obj_fields.join(', '),
          'FROM',
          obj_name
        ];
        if (ext_query) {
          queryParams.push(ext_query);
        }
        let url = '/services/data/v43.0/query/?q=' + encodeURIComponent(queryParams.join(' '));
        let response = null;
        while(response = await this.do_request(url)) {
          if (response.records) {
            const segments = response.records.map(record => {
              delete record.attributes;
              return record;
            }); // {...record, attributes: undefined}))

            list.push(
              ...segments
            );

            if (callback) await callback(segments);
          }
          if (!response.done && response.nextRecordsUrl) {
            url = response.nextRecordsUrl;
          } else {
            break;
          }
        }
        return resolve(list);
      } catch(e) {
        reject(e);
      }
    });
  }

  getObjectUpdatedRecords (obj_name = '', startAt = '', endAt = '', obj_fields = ['Id']) {
    return new Promise(async (resolve, reject) => {
      try {
        const updatedResponse = await this.do_request(`/services/data/v43.0/sobjects/${obj_name}/updated/?start=${encodeURIComponent(startAt)}&end=${encodeURIComponent(endAt)}`);
        // console.log(`latestDateCovered (${obj_name} : UPDATED) - ${updatedResponse.latestDateCovered}`);

        if (updatedResponse.ids.length == 0) return resolve([]);
        const records = await this.do_request(`/services/data/v43.0/composite/sobjects/${obj_name}`, {
          is_post: true,
          data: {
            ids: updatedResponse.ids,
            fields: obj_fields,
          },
        });
        const list = records.filter(record => record).map(record => {
          delete record.attributes;
          return record;
        })
        return resolve(list);
      } catch(e) {
        reject(e);
      }
    });
  }

  getObjectDeletedRecords (obj_name = '', startAt = '', endAt = '', obj_fields = ['Id']) {
    return new Promise(async (resolve, reject) => {
      try {
        const deletedResponse = await this.do_request(`/services/data/v43.0/sobjects/${obj_name}/deleted/?start=${encodeURIComponent(startAt)}&end=${encodeURIComponent(endAt)}`);
        // console.log(`latestDateCovered (${obj_name} : DELETED) - ${deletedResponse.latestDateCovered}`);

        if (deletedResponse.deletedRecords.length == 0) return resolve([]);
        return resolve(deletedResponse.deletedRecords.map(record => record.id));
      } catch(e) {
        reject(e);
      }
    });
  }

  getPricebookAndProducts (name = 'Standard Price Book') {
    return new Promise(async (resolve, reject) => {
      try {
        if (!name) throw 'Pricebook Name is Empty';
        const pricebook_response = await this.do_request('/services/data/v43.0/query/?q=' + encodeURIComponent("SELECT Id, (select Id, Name, ProductCode, UnitPrice from PricebookEntries) FROM Pricebook2 WHERE Name='" + name + "' LIMIT 1"));
        if (pricebook_response.records.length == 0) throw 'Pricebook does not exist';
        const pricebook_record = pricebook_response.records[0];
        resolve({
          id: pricebook_record.Id,
          products: pricebook_record.PricebookEntries.records.map((record) => ({
            id: record.Id,
            name: record.Name,
            sku: record.ProductCode,
            price: record.UnitPrice,
          }))
        });
      } catch(error) {
        reject({
          from: 'getPricebookAndProducts',
          error,
        });
      }
    })
  }

  createShopifyCustomerFromContact (contact_id) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!contact_id) throw 'Contact ID is missing';
        const contactData = await this.do_request('/services/data/v20.0/sobjects/Contact/' + contact_id);
        // console.log('SF contact --- ', contactData);

        const customers = await shopify.customer.search({
          query: 'email:' + contactData.Email
        });

        let customer_id = null;

        if (customers.length) {

          let customer = customers[0];

          await shopify.customer.update(customer.id, {
            tags: customer.tags + ', QUALIFIED, SF-' + contact_id, //+ ', PLAN-' + (contactData.Current_method_of_payment__c == "Yes, I'm prepared to pay cash now." ? 'CASH' : 'RTO'),
          });
          // await shopify.customer.sendInvite(customer.id);
          // console.log('existing customers --- ', customer);

          customer_id = customer.id;

        } else {

          const newTags = [
            'SF-CONTACT-' + contact_id,
            'SF-ACCOUNT-' + contactData.AccountId,
            'QUALIFIED',
          ];

          let phoneNumberParsed = '';
          try {
            let phoneNumber = phoneUtil.parseAndKeepRawInput(contactData.Phone, 'US');
            phoneNumberParsed = phoneUtil.isValidNumber(phoneNumber) ? phoneNumber.getNationalNumber() : '';
          } catch(e) {
            phoneNumberParsed = '';
          }

          const customerParams = {
            first_name: contactData.FirstName,
            last_name: contactData.LastName,
            email: contactData.Email,
            // phone: phoneNumberParsed,
            addresses: [
              {
                address1: contactData.MailingStreet || '',
                city: contactData.MailingCity || '',
                province: helper.getStateCode(contactData.MailingState),
                phone: phoneNumberParsed,
                zip: contactData.MailingPostalCode || '',
                last_name: contactData.LastName,
                first_name: contactData.FirstName,
                country: 'US',
              }
            ],
            verified_email: true,
            password: SHOPIFY_CUSTOMER_CREDS,
            password_confirmation: SHOPIFY_CUSTOMER_CREDS,
            send_email_welcome: false,
            tags: newTags.join(','),
          };
          // console.log(customerParams);

          const customerData = await shopify.customer.create(customerParams);
          // console.log('new customer --- ', customerData);

          customer_id = customerData.id;

        }

        await this.do_request('/services/data/v20.0/sobjects/Contact/' + contact_id, {
          is_post: true,
          is_patch: true,
          data: {
            'Shopify_Customer_ID__c': customer_id,
          },
        });

        // request({
        //   url: 'https://partial.ly/api/customer',
        //   headers: {
        //     Authorization: 'Bearer ' + PARTIALLY_API_KEY,
        //   },
        //   method: 'POST',
        //   json: true,
        //   body: {
        //     email: contactData.Email,
        //     first_name: contactData.FirstName,
        //     last_name: contactData.LastName,
        //   },
        // }, (error, response, customer) => {
        //   resolve();
        // });

        resolve();

      } catch(error) {
        reject(error)
      }
    });
  }

  createShopifyCustomerFromLead (lead_id) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!lead_id) throw 'Lead ID is missing';
        const leadData = await this.do_request('/services/data/v20.0/sobjects/Lead/' + lead_id);
        // console.log('SF lead --- ', leadData);

        const customers = await shopify.customer.search({
          query: 'email:' + leadData.Email
        });

        let customer_id = null;

        if (customers.length) {

          let customer = customers[0];

          const newTags = customer.tags.split(',');

          // QUALIFIED status
          let delIndex = newTags.findIndex(tag => tag.includes('QUALIFIED'));
          if (delIndex > -1) {
            newTags.splice(delIndex, 1);
          }
          // if (leadData.Status == 'Qualified') {
            newTags.push('QUALIFIED');
          // }

          // Checkout Method - RTO or CASH
          delIndex = newTags.findIndex(tag => tag.includes('PLAN-'));
          if (delIndex > -1) {
            newTags.splice(delIndex, 1);
          }
          newTags.push('PLAN-' + leadData.Checkout_Method__c);

          await shopify.customer.update(customer.id, {
            tags: newTags.join(','),
          });
          // await shopify.customer.sendInvite(customer.id);
          // console.log('existing customers --- ', customer);

          customer_id = customer.id;

        } else {

          const newTags = [
            'SF-LEAD-' + lead_id,
            'PLAN-' + leadData.Checkout_Method__c,
          ];
          // if (leadData.Status == 'Qualified') {
            newTags.push('QUALIFIED');
          // }

          let phoneNumberParsed = '';
          try {
            let phoneNumber = phoneUtil.parseAndKeepRawInput(leadData.Phone, 'US');
            phoneNumberParsed = phoneUtil.isValidNumber(phoneNumber) ? phoneNumber.getNationalNumber() : '';
          } catch(e) {
            phoneNumberParsed = '';
          }

          const customerParams = {
            first_name: leadData.FirstName,
            last_name: leadData.LastName,
            email: leadData.Email,
            // phone: phoneNumberParsed,
            addresses: [
              {
                address1: leadData.Street || '',
                city: leadData.City || '',
                province: helper.getStateCode(leadData.State),
                phone: phoneNumberParsed,
                zip: leadData.PostalCode || '',
                last_name: leadData.LastName,
                first_name: leadData.FirstName,
                country: 'US',
              }
            ],
            verified_email: true,
            password: SHOPIFY_CUSTOMER_CREDS,
            password_confirmation: SHOPIFY_CUSTOMER_CREDS,
            send_email_welcome: false,
            tags: newTags.join(','),
          };
          // console.log(customerParams);

          const customerData = await shopify.customer.create(customerParams);
          // console.log('new customer --- ', customerData);

          customer_id = customerData.id;

        }

        await this.do_request('/services/data/v20.0/sobjects/Lead/' + lead_id, {
          is_post: true,
          is_patch: true,
          data: {
            'Shopify_Customer_ID__c': customer_id,
          },
        });

        resolve();

      } catch(error) {
        reject(error)
      }
    });
  }

  fulfillShopifyOrderFromSalesforce (order_id) {
    return new Promise(async (resolve, reject) => {
      try {

        const shopProperties = await shopify.shop.get();
        const fulfillmentData = {
          location_id: shopProperties.primary_location_id,
        };

        const order_response = await this.do_request('/services/data/v20.0/sobjects/Order/Shopify_Order_ID__c/' + order_id);
        if (order_response.Id && order_response.Tracking__c) {
          fulfillmentData.tracking_number = order_response.Tracking__c;
        }

        const fulfillmentResponse = await shopify.fulfillment.create(order_id, fulfillmentData);

        // console.log(fulfillmentResponse);

        resolve();
      } catch(e) {
        reject(e);
      }
    });
  }

  sleep (seconds = 1) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  handle_shopify_orderCreation (payload) {
    return new Promise(async (resolve, reject) => {
      try {

        const order = payload;

        try {
          const order_response = await this.do_request('/services/data/v20.0/sobjects/Order/Shopify_Order_ID__c/' + order.id);
          if (order_response.Id || order_response.length) {
            return resolve({
              message: 'This order(' + order.id + ') was already exported',
              orderResponse: order_response,
            });
          }
        } catch(e) {
          if (e.errorCode != 'NOT_FOUND') throw e;
        }

        const customerTags = order.customer.tags.split(',');

        let leadIdTag = customerTags.find(tag => tag.includes('SF-LEAD-'));
        if (!leadIdTag) throw 'Cannot find relevant SF Lead';
        let lead_id = leadIdTag.split('SF-LEAD-')[1];

        let contactIdTag = customerTags.find(tag => tag.includes('SF-CONTACT-'));
        let accountIdTag = customerTags.find(tag => tag.includes('SF-ACCOUNT-'));
        if (!contactIdTag || !accountIdTag) {
          try {
            const leadConversionResult = await this.do_request('/services/data/v20.0/sobjects/Lead/' + lead_id, {
              is_post: true,
              is_patch: true,
              data: {
                // 'Trigger_Conversion__c': true,
                'Status': 'Purchase Lead',
                'Sub_Category__c': 'Committed',
              },
            });
          } catch(e) {}
          
          let max_retry = 30;
          while(max_retry > 0) {
            await this.sleep();
            console.log('waiting until lead is converted');
            console.log(max_retry);

            const leadData = await this.do_request('/services/data/v20.0/sobjects/Lead/' + lead_id);
            if (leadData.ConvertedContactId && leadData.ConvertedAccountId) {
              customerTags.push('SF-CONTACT-' + leadData.ConvertedContactId);
              customerTags.push('SF-ACCOUNT-' + leadData.ConvertedAccountId);
              await shopify.customer.update(order.customer.id, {
                tags: customerTags.join(','),
              });
              contactIdTag = 'SF-CONTACT-' + leadData.ConvertedContactId;
              accountIdTag = 'SF-ACCOUNT-' + leadData.ConvertedAccountId;
              break;
            }

            max_retry--;
          }
        }

        if (!contactIdTag || !accountIdTag) {
          throw 'Lead conversion failed or took longer than expected. Try again later.';
        }

        let contact_id = contactIdTag.split('SF-CONTACT-')[1];
        let account_id = accountIdTag.split('SF-ACCOUNT-')[1];

        const pricebook = await this.getPricebookAndProducts();
        const order_data = {
          'order': [{
            'attributes' : {
              'type': 'Order',
            },
            'accountId'                    : account_id,
            'Contact__c'                   : contact_id,
            'Shopify_Customer_ID__c'       : order.customer.id,
            'EffectiveDate'                : order.updated_at,
            'Status'                       : 'Draft',
            'Pricebook2Id'                 : pricebook.id,
            'Shopify_Shipping_Amount__c'   : order.total_shipping_price_set.shop_money.amount,
            'Shopify_Total_Amount__c'      : order.total_price_set.shop_money.amount,
            'Tax_Amount__c'                : order.total_tax_set.shop_money.amount,
            'Paid_Amount__c'               : 0,
            'Shopify_Order_ID__c'          : order.id,
            'Shopify_Order_Number__c'      : order.order_number,
            'Type'                         : order.gateway == 'shopify_payments' ? 'Shopify' : 'Partial.ly',
            'OrderItems'                   : {
              'records' : order.line_items.map((item) => {
                const line_item = {
                  'attributes' : {
                    'type': 'OrderItem'
                  },
                  'PricebookEntryId'   : (pricebook.products.find((product) => product.sku == item.sku) || {}).id || '',
                  'Quantity'           : item.quantity,
                  'UnitPrice'          : item.price,
                };
                let discount = item.total_discount / (item.quantity * item.price);
                if (discount > 0) {
                  line_item['Discount__c'] = discount * 100;
                  line_item['Description'] = item.discount_allocations.map(dalloc => order.discount_applications[dalloc.discount_application_index].description).join('\n');
                }
                return line_item;
              }),
            },
          }]
        };
        if (order.discount_applications.length > 0) {
          order_data['order'][0]['Discount_Total__c'] = order.discount_codes.reduce((s, a) => parseFloat(a.amount) + s, 0);
        }

        if (order.billing_address) {
          order_data['order'][0]['BillingStreet'] = order.billing_address.address1;
          order_data['order'][0]['BillingCity'] = order.billing_address.city;
          order_data['order'][0]['BillingState'] = order.billing_address.province;
          order_data['order'][0]['BillingPostalCode'] = order.billing_address.zip;
          order_data['order'][0]['BillingCountry'] = order.billing_address.country;
        }
        if (order.shipping_address) {
          order_data['order'][0]['ShippingStreet'] = order.shipping_address.address1;
          order_data['order'][0]['ShippingCity'] = order.shipping_address.city;
          order_data['order'][0]['ShippingState'] = order.shipping_address.province;
          order_data['order'][0]['ShippingPostalCode'] = order.shipping_address.zip;
          order_data['order'][0]['ShippingCountry'] = order.shipping_address.country;

          const contactUpdateData = {
            'MailingStreet': order.shipping_address.address1,
            'MailingCity': order.shipping_address.city,
            'MailingState': order.shipping_address.province,
            'MailingPostalCode': order.shipping_address.zip,
            'MailingCountry': order.shipping_address.country,
          };
          if (order.shipping_address.phone) {
            contactUpdateData['Phone'] = order.shipping_address.phone;
          }
          await this.do_request('/services/data/v20.0/sobjects/Contact/' + contact_id, {
            is_post: true,
            is_patch: true,
            data: contactUpdateData,
          });
        }

        const order_response = await this.do_request('/services/data/v30.0/commerce/sale/order/', {
          is_post: true,
          data: order_data,
        });

        await shopify.order.update(order.id, {
          tags: order.tags + ', SF-ORDER-' + order_response.records[0].Id,
        });


        if (order.gateway == 'shopify_payments') {
          if (order.financial_status == 'paid') {
            const order_update_response = await this.do_request('/services/data/v20.0/sobjects/Order/' + order_response.records[0].Id, {
              is_post: true,
              is_patch: true,
              data: {
                'Paid_Amount__c': order.total_price_set.shop_money.amount,
                'Status': 'Activated',
              },
            });
          }
        } else {
          const transactions = await shopify.transaction.list(order.id);
          let total_paid = transactions.filter(t => t.kind == 'capture').reduce((s, t) => parseFloat(t.amount) + s, 0);

          const order_update_response = await this.do_request('/services/data/v20.0/sobjects/Order/' + order_response.records[0].Id, {
            is_post: true,
            is_patch: true,
            data: {
              'Paid_Amount__c': total_paid,
              'Status': 'Activated',
            },
          });
        }

        resolve();
      } catch(e) {
        reject(e);
      }
    });
  }

  handle_shopify_orderPayment (payload) {
    return new Promise(async (resolve, reject) => {
      try {

        const order = payload;

        if (order.gateway == 'shopify_payments') {
          return resolve();
        }

        const orderTags = order.tags.split(',');

        let orderIdTag = orderTags.find(tag => tag.includes('SF-ORDER-'));
        if (!orderIdTag) {
          throw 'Order is not yet migrated to SF';
        }
        let sf_orderId = orderIdTag.split('SF-ORDER-')[1];

        const order_update_response = await this.do_request('/services/data/v20.0/sobjects/Order/' + sf_orderId, {
          is_post: true,
          is_patch: true,
          data: {
            'Paid_Amount__c': order.total_price_set.shop_money.amount,
            'Status': 'Activated',
          },
        });

        resolve();
      } catch(e) {
        reject(e);
      }
    });
  }

  handle_shopify_orderUpdate (payload) {
    return new Promise(async (resolve, reject) => {
      try {

        const order = payload;

        if (order.gateway == 'shopify_payments') {
          return resolve();
        }

        const orderTags = order.tags.split(',');

        let orderIdTag = orderTags.find(tag => tag.includes('SF-ORDER-'));
        if (!orderIdTag) {
          throw 'Order is not yet migrated to SF';
        }
        let sf_orderId = orderIdTag.split('SF-ORDER-')[1];

        const transactions = await shopify.transaction.list(order.id);
        let total_paid = transactions.filter(t => t.kind == 'capture').reduce((s, t) => parseFloat(t.amount) + s, 0);

        const order_update_response = await this.do_request('/services/data/v20.0/sobjects/Order/' + sf_orderId, {
          is_post: true,
          is_patch: true,
          data: {
            'Paid_Amount__c': total_paid,
          },
        });

        // console.log(order_update_response);

        resolve();
      } catch(e) {
        reject(e);
      }
    });
  }

  pushTrackings (customer_id, customerTagsString, trackings) {
    return new Promise(async (resolve, reject) => {
      try {

        const records_data = {
          records: [],
        };

        const customerTags = customerTagsString.split(',');

        let leadIdTag = customerTags.find(tag => tag.includes('SF-LEAD-'));
        let lead_id = leadIdTag ? leadIdTag.split('SF-LEAD-')[1] : '';

        let contactIdTag = customerTags.find(tag => tag.includes('SF-CONTACT-'));
        let contact_id = contactIdTag ? contactIdTag.split('SF-CONTACT-')[1] : '';

        trackings.forEach(tracking => {
          const insertData = {
            attributes: {
              type: 'Tracking__c',
            },
            'Shopify_Customer_ID__c': customer_id,
            'Lead__c': lead_id,
            'Contact__c': contact_id,
          };
          let data = null;
          try {
            data = JSON.parse(tracking) || {};
          } catch(e) {
            data = {};
          }
          Object.keys(data).forEach(key => {
            insertData[key + '__c'] = data[key];
          });
          records_data.records.push(insertData);
        });

        console.log(`Inserting ${records_data.records.length} records for <Tracking__c> object`);
        let response = await this.do_request(`/services/data/v43.0/composite/sobjects`, {
          is_post: true,
          data: records_data
        });

        console.log(response);

        return resolve();

      } catch(e) {
        console.log(e);
        reject(e);
      }
    })
  }

  get_shopify_products () {
    return new Promise(async (resolve, reject) => {
      try {
        const data = [];

        let url = '/services/data/v43.0/query/?q=' + encodeURIComponent("SELECT ID, Shopify_Product_ID__c, Shopify_Variant_ID__c, (SELECT UnitPrice from PricebookEntries WHERE IsActive=true) FROM Product2 WHERE IsActive=true AND (Shopify_Product_ID__c!='' OR Shopify_Variant_ID__c!='')");
        let response = null;
        while(response = await this.do_request(url)) {
          if (response.records) {
            response.records.forEach((record) => {
              if (!record.PricebookEntries) return;
              data.push({
                ID: record.Id,
                Shopify_Product_ID: record.Shopify_Product_ID__c,
                Shopify_Variant_ID: record.Shopify_Variant_ID__c,
                PricebookEntries: record.PricebookEntries.records,
              });
            })
          }
          if (!response.done && response.nextRecordsUrl) {
            url = response.nextRecordsUrl;
          } else {
            break;
          }
        }

        return resolve(data);
      } catch(e) {
        reject(e);
      }
    });
  }

  sf_shopify_price_sync () {
    return new Promise(async (resolve, reject) => {
      try {
        const status = await this.getStatus();
        if (status.sf_shopify_price_sync) {
          if (status.sf_shopify_price_sync.running) {
            if (new Date(status.sf_shopify_price_sync.started) < new Date(Date.now() - 1000 * 60 * 1)) {
              console.log(`Process is still running, but seems to be frozen atm. It's restarting now.`);
            } else {
              return resolve(`Process is running atm. Started at ${status.sf_shopify_price_sync.started}`);
            }
          } else if (status.sf_shopify_price_sync.finished && new Date(status.sf_shopify_price_sync.finished) > new Date(Date.now() - 1000 * 60 * 1)) {
            return resolve(`Process is just finished, should wait for next turn. Finished at ${status.sf_shopify_price_sync.finished}`);
          }
        }
        await this.updateStatus('sf_shopify_price_sync', {
          running: true,
          started: new Date(),
        });

        const products = await this.get_shopify_products();

        let returnPromise = Promise.resolve();

        products.forEach(product => {
          returnPromise = returnPromise.then(async () => {
            try {
              if (product.Shopify_Variant_ID) {
                await shopify.productVariant.update(product.Shopify_Variant_ID, {
                  price: product.PricebookEntries[0].UnitPrice,
                  compare_at_price: null,
                });
              } else if (product.Shopify_Product_ID) {
                const productInfo = await shopify.product.get(product.Shopify_Product_ID);
                await shopify.productVariant.update(productInfo.variants[0].id, {
                  price: product.PricebookEntries[0].UnitPrice,
                  compare_at_price: null,
                });
              }
            } catch(e) {
              console.log(product, e.response.body);
              return Promise.reject(e);
            }
            return Promise.resolve();
          });
        });

        await returnPromise;

        await this.updateStatus('sf_shopify_price_sync', {
          running: false,
          finished: new Date(),
        });

        resolve({
          success: true,
          // products,
        });
      } catch(error) {
        resolve({
          success: false,
          error,
        });
      }
    });
  }

  get_lead_by_email (email) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = [];

        let url = '/services/data/v43.0/query/?q=' + encodeURIComponent("SELECT ID, Email, ConvertedAccountId, ConvertedContactId FROM Lead WHERE Email='" + email + "'");
        let response = null;
        while(response = await this.do_request(url)) {
          if (response.records) {
            response.records.forEach((record) => {
              data.push({
                ID: record.Id,
                Email: record.Email,
                ConvertedAccountId: record.ConvertedAccountId,
                ConvertedContactId: record.ConvertedContactId,
              });
            })
          }
          if (!response.done && response.nextRecordsUrl) {
            url = response.nextRecordsUrl;
          } else {
            break;
          }
        }

        return resolve(data[0]);
      } catch(e) {
        reject(e);
      }
    });
  }

}

module.exports = new sfdcHandler();
