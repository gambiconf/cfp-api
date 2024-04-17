import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { makeSubmissionFromBody } from './handler';
import { sendMail } from './sendEmail';
import clientSecret from './client_secret.json';

async function main() {
  const email = process.env.EMAIL as string;

  const body = {
    speakerName: 'Bruno Macabeus',
    twitterHandler: '@bmacabeus',
    type: 'talk',
    language: 'portuguese_or_english',
    title: 'My Talk',
    description: 'The Talk Description',
    duration: 20,
    speakerBio: 'My Bio',
    speakerSocialMedias: 'Twitter: @bmacabeus',
    speakerEmail: email,
  } as const;

  const submission = makeSubmissionFromBody(body);

  const serviceAccountAuth = new JWT({
    email: clientSecret.client_email,
    key: clientSecret.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const googleSheetID = process.env.SHEET_ID!;
  const sheet = new GoogleSpreadsheet(googleSheetID, serviceAccountAuth);
  await sheet.loadInfo();

  const tab = sheet.sheetsByTitle.CFP;

  await tab.loadHeaderRow();

  await tab.addRow(submission);
  const result = await sendMail(submission);
  console.log(result);

  console.log(`E-mail sent to: ${email}`);
}

main().catch(console.error);
