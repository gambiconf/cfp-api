# cfp-api

Lambda API for the Call for Papers of the GambiConf conference.

## Information flow

For now this project only covers adding proposals, it will support editing them later.

### Adding proposals

Once an user wants to apply for talking at the conference, they will open [this web page](https://github.com/gambiconf/gambiconf.github.io/blob/ac1d80f6ac628e7b2d60a5f3045673ce941480da/src/network/cfp.ts), and it will hit the main handler in [handler.js](https://github.com/gambiconf/cfp-api/blob/30253dce736c5a0c954f205cc5209a1bb4719d59/handler.js).

The contents of the form will be sent to it, and be validated that they conform to a specific structure/spec. That being correct, the handler will add the talk submission to a row in a Google Spreadsheet. To finish it's execution, it will send an e-mail of confirmation to who applied the talk.
