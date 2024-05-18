import { NextApiRequest, NextApiResponse } from 'next';
// import { IInvoice } from '@/interfaces/invoice';
// import { IResponseData } from '@/interfaces/response_data';
import fs from 'fs';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { invoiceId } = req.query;
    if (!invoiceId) {
      throw new Error('Invalid input parameter');
    }
    // Find the invoice with the given id
    // Find the invoice with the given id
    const invoiceFileNameRegex = new RegExp(`.*${invoiceId}.*`);
    const invoiceFilePath = fs
      .readdirSync('tmp')
      .find((fileName) => invoiceFileNameRegex.test(fileName));
    if (!invoiceFilePath) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }
    const invoiceImage = fs.readFileSync(`tmp/${invoiceFilePath}`);
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
