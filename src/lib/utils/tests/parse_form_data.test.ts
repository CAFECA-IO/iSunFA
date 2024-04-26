// parseForm.test.ts
import { NextApiRequest } from 'next';
import { IncomingForm } from 'formidable';
import * as path from 'path';
import { parseForm } from '../parse_form_data';
import { FORMIDABLE_CONFIG } from '../../../constants/config';
// Mock fs and IncomingForm
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
  },
}));

jest.mock('formidable', () => {
  return {
    IncomingForm: jest.fn(() => ({
      parse: jest.fn((req, callback) => {
        callback(null, { testField: 'testValue' }, { testFile: 'testPath' });
      }),
      on: jest.fn(),
    })),
  };
});

describe('parseForm', () => {
  beforeEach(() => {
    jest.resetAllMocks(); // Ensures that configurations from other tests don't leak into this one

    // Set up a general mock for IncomingForm that works without throwing errors
    (IncomingForm as unknown as jest.Mock).mockImplementation(() => ({
      parse: jest.fn((req, callback) => {
        callback(null, { testField: 'testValue' }, { testFile: 'testPath' });
      }),
    }));
  });
  it('should correctly set the upload directory based on environment', async () => {
    delete process.env.VERCEL;
    const req = { headers: {}, url: '/api/test', method: 'POST' } as NextApiRequest;

    const expectedPath = path.join(process.cwd(), FORMIDABLE_CONFIG.uploadDir);
    await parseForm(req);

    expect(IncomingForm).toHaveBeenCalledWith(
      expect.objectContaining({
        uploadDir: expectedPath,
      })
    );
  });

  it('should use a different directory when VERCEL environment is set', async () => {
    process.env.VERCEL = '1';
    const req = { headers: {}, url: '/api/test', method: 'POST' } as NextApiRequest;

    await parseForm(req);

    expect(IncomingForm).toHaveBeenCalledWith(
      expect.objectContaining({
        uploadDir: FORMIDABLE_CONFIG.uploadDir,
      })
    );
  });
});
