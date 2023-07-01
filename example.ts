import { GoogleSpreadsheet } from 'google-spreadsheet';
import { validate, sendMail } from './handler';
import clientSecret from './client_secret.json';

async function main() {
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
    speakerEmail: process.env.EMAIL as string,
  } as const;

  const googleSheetID = process.env.SHEET_ID;
  const sheet = new GoogleSpreadsheet(googleSheetID);
  await sheet.useServiceAccountAuth(clientSecret);
  await sheet.loadInfo();

  const tab = sheet.sheetsByTitle.CFP;

  await tab.loadHeaderRow();

  await validate(body);

  await tab.addRow(body);
  const result = await sendMail(body);
  console.log(result);
}

main().catch(console.error);
