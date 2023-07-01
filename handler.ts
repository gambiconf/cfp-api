import type { APIGatewayProxyEvent } from 'aws-lambda';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import * as yup from 'yup';
import { SES, SendEmailCommandInput } from '@aws-sdk/client-ses';
import sanitizeHtml from 'sanitize-html';
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
  const schema: yup.ObjectSchema<Schema> = yup.object().shape({
    speakerName: yup.string().required(),
    twitterHandler: yup.string().required(),
    type: yup.string().oneOf(['talk', 'sprint']).required(),
    language: yup
      .string()
      .oneOf(['only_portuguese', 'only_english', 'portuguese_or_english'])
      .required(),
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
  const talkTitle = sanitizeHtml(schema.title)

  const messageBody =
    schema.language === 'only_portuguese'
      ? `Hey 👋<br />
<br />
Recebemos a submissão da sua apresentação para a GambiConf: <strong>"${talkTitle}"</strong><br />
Agradecemos seu interesse em contribuir com nosso evento. Obrigado!<br />
<br />
Após o término do CFP entraremos em contato.<br />
<br />
As previsão das próximas etapas são:<br />
- Encerramento do CFP: 27 de Agosto<br />
- Ensaio (opcional): 28 de Agosto até 18 de Novembro<br />
- Evento: 25 e 26 de Novembro<br />
<br />
Siga-nos no Twitter para ser o primeiro a saber das novidades: <a href="https://twitter.com/gambiconf">@gambiconf</a><br />
<br />
Obrigado,<br />
Organização da GambiConf
`
      : `Hey 👋<br />
<br />
We acknowledge the receipt of your submission to GambiConf, titled <strong>"${talkTitle}"</strong>.<br />
We appreciate your interest in contributing to our event. Thanks!<br />
<br />
Once the CFP concludes, we will be reaching out to you.<br />
<br />
Here's an overview of the upcoming stages:<br />
<br />
- CFP deadline: August 27th<br />
- Optional dry-run: August 28th to November 18th<br />
- Event: November 25th and 26th<br />
<br />
For the latest updates and news, we encourage you to follow us on Twitter at <a href="https://twitter.com/gambiconf">@gambiconf</a>.<br />
We will share updates there first, ensuring you stay informed.<br />
<br />
Best regards,<br />
GambiConf Organizing Team
`;

  const params: SendEmailCommandInput = {
    Source: process.env.EMAIL,
    Destination: {
      ToAddresses: [schema.speakerEmail],
    },
    Message: {
      Body: {
        Html: {
          Data: messageBody,
        },
      },
      Subject: {
        Data: 'GambiConf - CFP',
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
