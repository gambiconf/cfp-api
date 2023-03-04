'use strict'

require('dotenv').config()
const { GoogleSpreadsheet } = require('google-spreadsheet')
const clientSecret = require('./client_secret.json')
const yup = require('yup')
const AWS = require('aws-sdk')

AWS.config.update({region: process.env.AWS_REGION})
const ses = new AWS.SES({apiVersion: '2010-12-01'})

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

  return await schema.isValid(body)
}

const sendMail = async (body) => {
    const params = {
      Source: process.env.EMAIL,
      Destination: { 
        ToAddresses: [
          body.email
        ]
      },
      Message: {
        Body: {
          Text: {
            Data: 'kekekekek kekek sdf sdf sjfshjk shfjk fdsafsfsf fsafsdfs'
          }
        },
        Subject: {
          Data: 'CFP Gambiconf'
        }
      }
    }
    
    try {
      const sendPromise = await ses.sendEmail(params).promise()
      return {
        statusCode: 200,
        body: "Email sent"
      }
    } catch (error) {
      console.log(error)
      return {
        statusCode: 500,
        body: "Error " + error
      }
    }
}

const cfp = async (event) => {
  try {
    const googleSheetID = process.env.SHEET_ID
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
    const result = await sendMail(body)
    console.log(result)
    
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

module.exports.cfp = cfp

module.exports.validate = validate

module.exports.sendMail = sendMail
