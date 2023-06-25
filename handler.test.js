'use strict';

require('dotenv').config();
const handler = require('./handler');

jest.mock('google-spreadsheet', () => {
  return {
    GoogleSpreadsheet: jest.fn().mockImplementation(() => {
      return {
        useServiceAccountAuth: jest.fn(() => Promise.resolve()),
        loadInfo: jest.fn(() => Promise.resolve()),
        sheetsByTitle: {
          CFP: {
            loadHeaderRow: jest.fn(() => Promise.resolve()),
            addRow: jest.fn(() => Promise.resolve()),
          },
        },
      };
    }),
  };
});

describe('cfp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('should return a 422 statusCode when the body is not valid', async () => {
    const event = {
      body: JSON.stringify({
        name: '',
        title: '',
        description: '',
        duration: '',
        format: '',
        bio: '',
        social: '',
        email: '',
      }),
    };
    const result = await handler.cfp(event);
    expect(result.statusCode).toBe(422);
  });
  test('should return a 200 statusCode when the body is valid', async () => {
    const event = {
      body: JSON.stringify({
        name: '@bmacabeus',
        title: 'gameboy advance',
        description: 'kekekekek kekek sdf sdf sjfshjk shfjk fdsafsfsf fsafsdfs',
        duration: 30,
        format: 'in-person',
        bio: 'fdfsd fsfsd fsf sfda fsafdfs',
        social: 'twitter\nfacebook\ninstagram',
        email: process.env.EMAIL,
      }),
    };
    const result = await handler.cfp(event);
    expect(result.statusCode).toBe(200);
  });
});
