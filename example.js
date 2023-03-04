const { GoogleSpreadsheet } = require('google-spreadsheet')

const { validate, sendMail } = require('./handler.js')
const clientSecret = require('./client_secret.json')

async function main() {
  const body = {
    name: "eva pace",
    title: "bad talk hehe",
    description: "uwu bad talk descrip",
    duration: 15,
    format: "in-person",
    bio: "bla bla tech person, lot's of years bla bla",
    social: "@evaporei",
    email: process.env.EMAIL,
  }

  const googleSheetID = process.env.SHEET_ID
  const sheet = new GoogleSpreadsheet(googleSheetID)
  await sheet.useServiceAccountAuth(clientSecret)
  await sheet.loadInfo()

  const tab = sheet.sheetsByTitle['CFP']

  await tab.loadHeaderRow()

  const isValid = await validate(body)

  await tab.addRow(body)
  const result = await sendMail(body)
  console.log(result)
}

main()
  .catch(console.error)
