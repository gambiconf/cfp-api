require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const clientSecret = require('./client_secret.json');
const yup = require('yup');
const { SES } = require('@aws-sdk/client-ses');

const ses = new SES({
  region: process.env.SES_AWS_REGION,
  credentials: {
    accessKeyId: process.env.SES_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.SES_AWS_SECRET_ACCESS_KEY,
  },
  apiVersion: '2010-12-01',
});

const validate = async (body) => {
  const schema = yup.object().shape({
    name: yup.string().required(),
    title: yup.string().required(),
    description: yup.string().required(),
    duration: yup.number().oneOf([15, 20, 30, 45, 60]).required(),
    format: yup.string().oneOf(['in-person', 'online', 'both']).required(),
    bio: yup.string().required(),
    social: yup.string().required(),
    email: yup.string().email().required(),
  });

  return await schema.isValid(body);
};

const sendMail = async (body) => {
  const params = {
    Source: process.env.EMAIL,
    Destination: {
      ToAddresses: [body.email],
    },
    Message: {
      Body: {
        Text: {
          Data: 'kekekekek kekek sdf sdf sjfshjk shfjk fdsafsfsf fsafsdfs',
        },
      },
      Subject: {
        Data: 'CFP Gambiconf',
      },
    },
  };

  await ses.sendEmail(params);
};

const loadGoogleSheetCFP = async () => {
  const googleSheetID = process.env.SHEET_ID;

  const sheet = new GoogleSpreadsheet(googleSheetID);

  try {
    await sheet.useServiceAccountAuth(clientSecret);
    await sheet.loadInfo();
  } catch (error) {
    console.error({
      tag: '[FATAL ERROR] Failed to load the spreadsheet',
      metadata: {
        googleSheetID,
        message: error?.message,
        stack: error?.stack,
      },
    })

    throw error;
  }

  const sheetTab = sheet.sheetsByTitle.CFP;

  try {
    await sheetTab.loadHeaderRow();
  } catch (error) {
    console.error({
      tag: '[FATAL ERROR] Failed to load the CFP sheet header row',
      metadata: {
        sheets: Object.keys(sheet.sheetsByTitle),
        message: error?.message,
        stack: error?.stack,
      },
    })

    throw error;
  }

  return sheetTab;
}

const cfp = async (event) => {
  try {
    console.log({
      tag: '[LOG]',
      metadata: {
        message: 'Received a new request',
        event: JSON.stringify(event),
      }
    })

    const body = JSON.parse(event.body);
    const isValid = await validate(body);
    if (!isValid) {
      console.error({
        tag: '[INVALID BODY]',
        metadata: { body },
      });

      return {
        statusCode: 422,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({
          message: 'Invalid request',
        }),
      };
    }

    const sheetTab = await loadGoogleSheetCFP()
    try {
      await sheetTab.addRow(body);
    } catch(error) {
      console.error({
        tag: '[FATAL ERROR] Could not add the new row on the sheet',
        metadata: {
          event: JSON.stringify(event),
          message: error?.message,
          stack: error?.stack,
        },
      });
      throw error;
    }

    try {
      await sendMail(body);
    } catch (error) {
      console.error({
        tag: '[FATAL ERROR] Could not send the e-mail',
        metadata: {
          event: JSON.stringify(event),
          message: error?.message,
          stack: error?.stack,
        },
      });
      throw error;
    }

    return {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      statusCode: 200,
    };
  } catch (error) {
    console.error({
      tag: '[FATAL ERROR]',
      metadata: {
        event: JSON.stringify(event),
        email: process.env.EMAIL,
        message: error?.message,
        stack: error?.stack,
      },
    });

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
  }
};

module.exports.cfp = cfp;

module.exports.validate = validate;

module.exports.sendMail = sendMail;
