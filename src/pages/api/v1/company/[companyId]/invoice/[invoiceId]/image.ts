import { NextApiRequest, NextApiResponse } from 'next';
// import { IInvoice } from '@/interfaces/invoice';
// import { IResponseData } from '@/interfaces/response_data';
import fs from 'fs';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import path from 'path';
import { BASE_STORAGE_FOLDER, FileFolder, VERCEL_STORAGE_FOLDER } from '@/constants/file';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { invoiceId } = req.query;
    if (!invoiceId) {
      throw new Error('Invalid input parameter');
    }
    // Find the invoice with the given id
    const invoiceFileNameRegex = new RegExp(`.*${invoiceId}.*`);
    const uploadDir =
      process.env.VERCEL === '1'
        ? VERCEL_STORAGE_FOLDER
        : path.join(BASE_STORAGE_FOLDER, FileFolder.INVOICE);

    const invoiceFilePath = fs
      .readdirSync(uploadDir)
      .find((fileName) => invoiceFileNameRegex.test(fileName));

    if (!invoiceFilePath) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    const invoiceImage = fs.readFileSync(path.join(uploadDir, invoiceFilePath));
    if (!invoiceImage) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }
    res.setHeader('Content-Type', 'image/jpeg');
    res.status(200).send(invoiceImage);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<Buffer>(error.message, {} as Buffer);
    res.status(httpCode).json(result);
  }
}
