import { SES, SendEmailCommandInput } from '@aws-sdk/client-ses';
import dedent from 'dedent-js';
import sanitizeHtml from 'sanitize-html';
import type { Submission } from './types';

const ses = new SES({
  region: process.env.SES_AWS_REGION,
  credentials: {
    accessKeyId: process.env.SES_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.SES_AWS_SECRET_ACCESS_KEY!,
  },
  apiVersion: '2010-12-01',
});

const getMessageBody = (submission: Submission) => {
  const talkTitle = sanitizeHtml(submission.title);

  if (submission.language === 'only_portuguese') {
    return dedent`
      Hey 👋<br />
      <br />
      Recebemos a submissão da sua apresentação para a GambiConf: <strong>"${talkTitle}"</strong><br />
      Agradecemos seu interesse em contribuir com nosso evento. Obrigado!<br />
      <br />
      Caso precise editar a sua submissão, use esse link: <a href="https://gambiconf.dev/cfp?id=${submission.id}">https://gambiconf.dev/cfp?id=${submission.id}</a><br />
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
    `;
  }

  return dedent`
    Hey 👋<br />
    <br />
    We acknowledge the receipt of your submission to GambiConf, titled <strong>"${talkTitle}"</strong>.<br />
    We appreciate your interest in contributing to our event. Thanks!<br />
    <br />
    If you need to update your submission, use this link: <a href="https://gambiconf.dev/cfp?id=${submission.id}">https://gambiconf.dev/cfp?id=${submission.id}</a>
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
}

export const sendMail = async (submission: Submission) => {
  const messageBody = getMessageBody(submission);

  const params: SendEmailCommandInput = {
    Source: process.env.EMAIL,
    Destination: {
      ToAddresses: [submission.speakerEmail],
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
