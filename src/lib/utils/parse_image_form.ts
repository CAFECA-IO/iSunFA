import { promises as fs } from 'fs';
import { NextApiRequest } from 'next';
import { IncomingForm, Files, Fields, Options } from 'formidable';
import path from 'path';
import { FORMIDABLE_CONFIG } from '@/constants/config';

// Info (20240316 - Murky) - This function is used to parse form image from post form
// Helper function to wrap formidable's parse method in a promise
export const parseForm = (
  req: NextApiRequest
): Promise<{ fields: Fields; files: Files<string> }> => {
  const formidableUploadUrl =
    process.env.VERCEL === '1'
      ? FORMIDABLE_CONFIG.uploadDir
      : path.join(process.cwd(), FORMIDABLE_CONFIG.uploadDir);
  const options: Partial<Options> = {
    encoding: 'utf-8',
    uploadDir: formidableUploadUrl,
    keepExtensions: true,
    maxFieldsSize: 200 * 1024 * 1024, // (200mb),
    maxFields: 1000,
    multiples: false,

    // Till (20240316 - Murky) 預留給以後開發使用
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    filter({ name, originalFilename, mimetype }) {
      // Info (20240316 - Murky) keep only images type
      return !!(mimetype && mimetype.includes('image'));
    },
  };

  // Info (20240327) - Murky, Check if /tmp folder exists, if not create it
  // I want to use await so i use async
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      await fs.mkdir(formidableUploadUrl, { recursive: false });
    } catch (error) {
      // Info: (20240329) Murky: Do nothing if /tmp already exist
    }
    const form = new IncomingForm(options);
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err);
      }
      return resolve({ fields, files });
    });
  });
};
