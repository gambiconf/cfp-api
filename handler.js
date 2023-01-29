'use strict'

const { GoogleSpreadsheet } = require('google-spreadsheet')
const clientSecret = require('./client_secret.json')
const yup = require('yup')
const R = require('ramda')

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

const validate = body => schema.isValid(body)

const handleError = R.curry((event, e) => {
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
})

const cfp = async (event) => {
    try {
        const body = JSON.parse(event.body)
        const validation = await validate(body)
        if(validation){
            const googleSheetID = '1u6BXqKLXojnyS8wHESGhYM3YkddBN44hmv166ZzKU44'
            const sheet = new GoogleSpreadsheet(googleSheetID)
            await sheet.useServiceAccountAuth(clientSecret)
            await sheet.loadInfo()
            const tab = sheet.sheetsByTitle['CFP']
            await tab.loadHeaderRow()
            await tab.addRow(body)
            return {
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
              },
              statusCode: 200,
            }
        }else {
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
    } catch (error) {
        return handleError(event)(error)
    }
}

module.exports = {cfp}
