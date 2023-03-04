# cfp-api

Lambda API for the Call for Papers of the GambiConf conference.

## Information flow

For now this project only covers adding proposals, it will support editing them later.

### Adding proposals

Once an user wants to apply for talking at the conference, they will open [this web page](https://github.com/gambiconf/gambiconf.github.io/blob/ac1d80f6ac628e7b2d60a5f3045673ce941480da/src/network/cfp.ts), and it will hit the main handler in [handler.js](https://github.com/gambiconf/cfp-api/blob/30253dce736c5a0c954f205cc5209a1bb4719d59/handler.js).

The contents of the form will be sent to it, and be validated that they conform to a specific structure/spec. That being correct, the handler will add the talk submission to a row in a Google Spreadsheet. To finish it's execution, it will send an e-mail of confirmation to who applied the talk.

## Running locally

The current dependencies we have are:

- AWS Lambda for running the handler;
- GCP for the spreadsheet;
- AWS SES for e-mail.

### Setting up AWS

1. First you'll need to have an AWS account, if you don't it's pretty straight forward to create one;
2. Create a group in the [IAM page](https://us-east-1.console.aws.amazon.com/iamv2/home?region=us-east-1#/home) with these permissions:
- AmazonSQSFullAccess;
- AmazonSESFullAccess;
- AWSLambda_FullAccess.
3. Then an user attached to this group which you can generate "Access keys" from it;
4. Put the credentials in `~/.aws/credentials`;
5. Finally you can create a verified identity in SES [here](https://us-east-1.console.aws.amazon.com/ses/home?region=us-east-1#/verified-identities), which will be the e-mail used for sending the confirmation to who applied the talk.

### Setting up the Google Spreadsheet

1. You'll need to have an account in GCP.
2. Create a GCP project;
3. Go to "APIs & Services" > "Library" then search for "Google Sheets API" or go to [this URL](https://console.cloud.google.com/apis/library/sheets.googleapis.com) (this link might fail if you have multiple google accounts and/or projects in GCP). Then enable this API for your account/project;
4. Then you can create a service account that will access the spreadsheet (in the credentials tab at the Google Sheets API page);
- Choose whatever name fits best;
- Add the "Editor" role and finish it.
5. Go to the new service account page, then create JSON keys for it;
6. You can move this file to the `cfp-api` folder, renaming it to `client_secret.json`;
7. Create a spreadsheet on Google Sheets with this content as the first line `name	title	description	duration	format	bio	social	email`, and the name of the Sheet in the bottom left of the page should be `CFP`;
8. Then you should share this spreadsheet with the e-mail created by the new service account (Editor permission!);
9. Finally copy the spreadsheet ID in the URL, eg: `1BSANxGdLChMVWYL7k8sDj0ekRQGrwWDEHdeFctiLZRo`, and change the environment variable.
