import { v4 as uuidv4 } from 'uuid';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { GoogleSpreadsheet, GoogleSpreadsheetRow, GoogleSpreadsheetWorksheet } from 'google-spreadsheet';
import * as yup from 'yup';
import clientSecret from './client_secret.json';
import type { BodySchema, Submission } from './types';
import { sendMail } from './sendEmail';

require('dotenv').config();

class NotFoundError extends Error {
  constructor() {
    super('Not Found');
    this.name = 'Not Found';
  }
}

export const makeSubmissionFromBody = (rawBody: object, id?: string): Submission => {
  const schema: yup.ObjectSchema<BodySchema> = yup.object().shape({
    speakerName: yup.string().required(),
    twitterHandler: yup.string(),
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

  const bodyValidated = schema.validateSync(rawBody);

  return {
    ...bodyValidated,
    id: id ?? uuidv4(),
  };
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

const getSubmissionRow = async (id: string, sheetTab: GoogleSpreadsheetWorksheet) => {
  let allSubmissionsRow: GoogleSpreadsheetRow[];
  try {
    allSubmissionsRow = await sheetTab.getRows();
  } catch (error) {
    console.error({
      tag: '[FATAL ERROR] Could not get the submissions',
      metadata: {
        message: error?.message,
        stack: error?.stack,
      },
    });
    throw error;
  }

  const givenSubmissionRow = allSubmissionsRow.find((submission) => submission.id === id);
  if (!givenSubmissionRow) {
    console.error({
      tag: '[NOT FOUND] Could not find the submission with the given id',
      metadata: {
        id,
      },
    });

    throw new NotFoundError()
  }

  return givenSubmissionRow;
}

export const getSubmissions = async (event: APIGatewayProxyEvent) => {
  try {
    console.log({
      tag: '[LOG]',
      metadata: {
        message: 'Received a new request for getSubmissions',
        event: JSON.stringify(event),
      },
    });

    const id = event.pathParameters!.id!

    const sheetTab = await loadGoogleSheetCFP();
    const givenSubmissionRow = await getSubmissionRow(id, sheetTab);

    const givenSubmission: Submission = {
      id: givenSubmissionRow.id,
      speakerName: givenSubmissionRow.speakerName,
      twitterHandler: givenSubmissionRow.twitterHandler,
      type: givenSubmissionRow.type,
      language: givenSubmissionRow.language,
      title: givenSubmissionRow.title,
      description: givenSubmissionRow.description,
      duration: givenSubmissionRow.duration,
      speakerBio: givenSubmissionRow.speakerBio,
      speakerSocialMedias: givenSubmissionRow.speakerSocialMedias,
      speakerEmail: givenSubmissionRow.speakerEmail,
    };

    return {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Content-Type': 'application/json; charset=utf-8',
      },
      statusCode: 200,
      body: JSON.stringify(givenSubmission),
    };
  } catch (error) {
    console.error({
      tag: '[FATAL ERROR]',
      metadata: {
        event: JSON.stringify(event),
        message: error?.message,
        stack: error?.stack,
      },
    });

    const statusCode = (typeof error === 'object' && error !== null && error instanceof NotFoundError)
      ? 404
      : 500;

    return {
      statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
  }
};

export const postSubmissions = async (event: APIGatewayProxyEvent) => {
  try {
    console.log({
      tag: '[LOG]',
      metadata: {
        message: 'Received a new request for postSubmissions',
        event: JSON.stringify(event),
      },
    });

    const body = JSON.parse(event.body!);
    let submission: Submission;
    try {
      submission = makeSubmissionFromBody(body);
    } catch (error) {
      console.error({
        tag: '[INVALID BODY]',
        metadata: { errors: error.errors, body },
      });

      return {
        statusCode: 422,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          message: 'Invalid form',
          errors: error.errors,
        }),
      };
    }

    const sheetTab = await loadGoogleSheetCFP();
    try {
      await sheetTab.addRow(submission);
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
      await sendMail(submission);
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
      body: JSON.stringify({
        id: submission.id,
      })
    };
  } catch (error) {
    console.error({
      tag: '[FATAL ERROR]',
      metadata: {
        event: JSON.stringify(event),
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

export const putSubmissions = async (event: APIGatewayProxyEvent) => {
  try {
    console.log({
      tag: '[LOG]',
      metadata: {
        message: 'Received a new request for putSubmissions',
        event: JSON.stringify(event),
      },
    });

    const id = event.pathParameters!.id!

    const body = JSON.parse(event.body!);
    let submission: Submission;
    try {
      submission = makeSubmissionFromBody(body, id);
    } catch (error) {
      console.error({
        tag: '[INVALID BODY]',
        metadata: { errors: error.errors, body },
      });

      return {
        statusCode: 422,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          message: 'Invalid form',
          errors: error.errors,
        }),
      };
    }

    const sheetTab = await loadGoogleSheetCFP();
    const givenSubmissionRow = await getSubmissionRow(id, sheetTab);

    try {
      await givenSubmissionRow.delete()
    } catch (error) {
      console.error({
        tag: '[FATAL ERROR] Could not remove the old row',
        metadata: {
          event: JSON.stringify(event),
          message: error?.message,
          stack: error?.stack,
        },
      });

      throw error;
    }

    try {
      await sheetTab.addRow(submission);
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
      await sendMail(submission);
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
        message: error?.message,
        stack: error?.stack,
      },
    });

    const statusCode = (typeof error === 'object' && error !== null && error instanceof NotFoundError)
      ? 404
      : 500;

    return {
      statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
  }
};
