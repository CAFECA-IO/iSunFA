import { NextApiRequest, NextApiResponse } from 'next';
// import { IInvoice } from '@/interfaces/invoice';
// import { IResponseData } from '@/interfaces/response_data';
import fs from 'fs';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { assertIsString } from '@/lib/utils/type_guard/common';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { fileId } = req.query;
    assertIsString(fileId);
    const fileNameRegex = new RegExp(`.*${fileId}.*`);
    const filePath = fs
      .readdirSync('tmp')
      .find((fileName) => fileNameRegex.test(fileName));
    if (!filePath) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }
    const file = fs.readFileSync(`tmp/${filePath}`);
    if (!file) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }
    res.setHeader('Content-Type', file.);
    res.status(200).send(invoiceImage);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<Buffer>(error.message, {} as Buffer);
    res.status(httpCode).json(result);
  }
}
