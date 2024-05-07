import { NextApiRequest, NextApiResponse } from 'next';
// import { IInvoice } from '@/interfaces/invoice';
// import { IResponseData } from '@/interfaces/response_data';
import { errorMessageToErrorCode } from '@/lib/utils/error_code';
import version from '@/lib/version';
import fs from 'fs';

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
      throw new Error('Invoice file not found');
    }
    const invoiceImage = fs.readFileSync(`tmp/${invoiceFilePath}`);
    if (!invoiceImage) {
      throw new Error('Resource not found');
    }
    res.setHeader('Content-Type', 'image/jpeg');
    res.status(200).send(invoiceImage);
  } catch (_error) {
    const error = _error as Error;
    const statusCode = errorMessageToErrorCode(error.message);
    res.status(statusCode).json({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: String(statusCode),
      payload: {},
      message: error.message,
    });
  }
}
