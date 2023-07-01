import type { APIGatewayProxyEvent } from 'aws-lambda';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import * as yup from 'yup';
import { SES, SendEmailCommandInput } from '@aws-sdk/client-ses';
import clientSecret from './client_secret.json';

require('dotenv').config();

type Schema = {
  speakerName: string;
  twitterHandler: string;
  type: 'talk' | 'sprint';
  language: 'only_portuguese' | 'only_english' | 'portuguese_or_english';
  title: string;
  description: string;
  duration?: 0 | 15 | 20 | 30 | 45;
  speakerBio: string;
  speakerSocialMedias: string;
  speakerEmail: string;
};

const ses = new SES({
  region: process.env.SES_AWS_REGION,
  credentials: {
    accessKeyId: process.env.SES_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.SES_AWS_SECRET_ACCESS_KEY!,
  },
  apiVersion: '2010-12-01',
});

const validate = async (body: object) => {
  const schema: yup.ObjectSchema<Schema>  = yup.object().shape({
    speakerName: yup.string().required(),
    twitterHandler: yup.string().required(),
    type: yup.string().oneOf(['talk', 'sprint']).required(),
    language: yup.string().oneOf(['only_portuguese', 'only_english', 'portuguese_or_english']).required(),
    title: yup.string().required(),
    description: yup.string().required(),
    duration: yup.number<0 | 15 | 20 | 30 | 45>().oneOf([0, 15, 20, 30, 45]),
    speakerBio: yup.string().required(),
    speakerSocialMedias: yup.string().required(),
    speakerEmail: yup.string().required(),
  });

  return await schema.isValid(body);
};

const sendMail = async (schema: Schema) => {
  const params: SendEmailCommandInput = {
    Source: process.env.EMAIL,
    Destination: {
      ToAddresses: [schema.speakerEmail],
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

  const result = await ses.sendEmail(params);
  return result;
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
    });

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
    });

    throw error;
  }

  return sheetTab;
};

const cfp = async (event: APIGatewayProxyEvent) => {
  try {
    console.log({
      tag: '[LOG]',
      metadata: {
        message: 'Received a new request',
        event: JSON.stringify(event),
      },
    });

    const body = JSON.parse(event.body!);
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

    const sheetTab = await loadGoogleSheetCFP();
    try {
      await sheetTab.addRow(body);
    } catch (error) {
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

export { cfp, validate, sendMail };
