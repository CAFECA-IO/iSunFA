import { IInvoice } from '@/interfaces/invoice';
import { IResponseData } from '@/interfaces/response_data';
import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { parseForm } from '@/lib/utils/parse_image_form';
import { promises as fs } from 'fs';
import { AICH_URI } from '@/constants/config';
// import { RESPONSE_STATUS_MESSAGE } from '@/constants/STATUS_MESSAGE';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { EventTypeEnum } from '@/interfaces/account';

// Info Murky (20240424) 要使用formidable要先關掉bodyParsor
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IInvoice[] | IAccountResultStatus[]>>
) {
  try {
    if (req.method === 'GET') {
      // Handle GET request to fetch all invoices
      const invoices = [
        {
          date: 21321321,
          invoiceId: '123123',
          eventType: EventTypeEnum.EXPENSE,
          paymentReason: 'purchase',
          description: 'description',
          venderOrSupplyer: 'vender',
          projectId: '123',
          contractId: '123',
          payment: {
            isRevenue: false,
            price: 100,
            hasTax: true,
            taxPercentage: 10,
            hasFee: true,
            fee: 10,
          },
        },
        {
          invoiceId: '2',
          date: 123123123,
          eventType: EventTypeEnum.INCOME,
          paymentReason: 'sale',
          description: 'description',
          venderOrSupplyer: 'vender',
          projectId: '123',
          contractId: '123',
          payment: {
            isRevenue: false,
            price: 100,
            hasTax: true,
            taxPercentage: 10,
            hasFee: true,
            fee: 10,
          },
        },
      ];

      const { httpCode, result } = formatApiResponse<IInvoice[]>(
        STATUS_MESSAGE.SUCCESS_GET,
        invoices as IInvoice[]
      );
      res.status(httpCode).json(result);
    } else if (req.method === 'POST') {
      let files: formidable.Files;
      try {
        files = (await parseForm(req)).files;
      } catch (error) {
        throw new Error(STATUS_MESSAGE.INVOICE_UPLOAD_FAILED_ERROR);
      }

      if (!files || !files.image || !files.image.length) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_FORMDATA_IMAGE);
      }

      // Info (20240504 - Murky): 圖片會先被存在本地端，然後才讀取路徑後轉傳給AICH
      const imageContent = await fs.readFile(files.image[0].filepath);
      const imageBlob = new Blob([imageContent], { type: files.image[0].mimetype || undefined });
      const imageName = files.image[0].filepath.split('/').pop() || 'unknown';

      const formData = new FormData();
      formData.append('image', imageBlob);
      formData.append('imageName', imageName);

      const fetchResult = await fetch(`${AICH_URI}/api/v1/ocr/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!fetchResult.ok) {
        throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
      }

      const resultJson: IAccountResultStatus[] = (await fetchResult.json()).payload;

      const { httpCode, result } = formatApiResponse<IAccountResultStatus[]>(
        STATUS_MESSAGE.CREATED,
        resultJson
      );

      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IInvoice[]>(error.message, {} as IInvoice[]);
    res.status(httpCode).json(result);
  }
}
