'use strict'

const { GoogleSpreadsheet } = require('google-spreadsheet')
const clientSecret = require('./client_secret.json')
const yup = require('yup')

const validate = async (body) => {
  const schema = yup.object().shape({
    name: yup.string().required(),
    title: yup.string().required(),
    description: yup.string().required(),
    duration: yup.number().oneOf([15, 20, 30, 45, 60]).required(),
    format: yup.string().oneOf(["in-person", "online", "both"]).required(),
    bio: yup.string().required(),
    social: yup.string().required(),
    email: yup.string().email().required(),
  })

  const isValid = await schema.isValid(body)

  return isValid
}

const cfp = async (event) => {
  try {
    const googleSheetID = '1u6BXqKLXojnyS8wHESGhYM3YkddBN44hmv166ZzKU44'
    const sheet = new GoogleSpreadsheet(googleSheetID)
    await sheet.useServiceAccountAuth(clientSecret)
    await sheet.loadInfo()

    const tab = sheet.sheetsByTitle['CFP']

    await tab.loadHeaderRow()

    const body = JSON.parse(event.body)

    const isValid = await validate(body)

    if (!isValid) {
      console.error({
        tag: '[INVALID BODY]',
        metadata: { body },
      })
  
      return {
        statusCode: 422,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },  
        body: JSON.stringify({
          message: 'Invalid request',
        }),
      }
    }

    await tab.addRow(body)

    return {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      statusCode: 200,
    }
  } catch (e) {
    console.error({
      tag: '[FATAL ERROR]',
      metadata: {
        event: JSON.stringify(event),
        message: e?.message,
        stack: e?.stack,
      },
    })

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    }
  }
}

// cfp({ input: { body: `{
//   "name": "@bmacabeus",
//   "talk title": "gameboy advance",
//   "description": "kekekekek kekek sdf sdf sjfshjk shfjk fdsafsfsf fsafsdfs",
//   "talk duration": 30,
//   "format": "in-person",
//   "bio": "fdfsd fsfsd fsf sfda fsafdfs",
//   "social medias": "twitter\\nfacebook\\ninstagram",
//   "email": "bruno.macabeus@gmail.com"
// }
// ` } }).catch((e) => {
//   debugger
// })

module.exports.cfp = cfp
