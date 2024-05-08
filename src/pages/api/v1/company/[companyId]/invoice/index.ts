import { IInvoice } from '@/interfaces/invoice';
import { IResponseData } from '@/interfaces/response_data';
import { errorMessageToErrorCode } from '@/lib/utils/error_code';
import version from '@/lib/version';
import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { parseForm } from '@/lib/utils/parse_image_form';
import { promises as fs } from 'fs';
import { AICH_URI } from '@/constants/config';
// import { RESPONSE_STATUS_CODE } from '@/constants/status_code';
import { IAccountResultStatus } from '@/interfaces/accounting_account';

// Info Murky (20240424) 要使用formidable要先關掉bodyParsor
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IInvoice | IAccountResultStatus[]>>
) {
  try {
    if (req.method === 'GET') {
      // Handle GET request to fetch all invoices
      const invoices: IInvoice[] = [
        {
          date: 21321321,
          invoiceId: '123123',
          eventType: 'expense',
          paymentReason: 'purchase',
          description: 'description',
          venderOrSupplyer: 'vender',
          payment: {
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
          eventType: 'income',
          paymentReason: 'sale',
          description: 'description',
          venderOrSupplyer: 'vender',
          payment: {
            price: 100,
            hasTax: true,
            taxPercentage: 10,
            hasFee: true,
            fee: 10,
          },
        },
      ];

      res.status(200).json({
        powerby: 'iSunFA v' + version,
        success: true,
        code: '200',
        message: 'request successful',
        payload: invoices,
      });
    } else if (req.method === 'POST') {
      let files: formidable.Files;
      try {
        files = (await parseForm(req)).files;
      } catch (error) {
        throw new Error('INTERNAL_SERVICE_ERROR');
      }

      if (!files || !files.image || !files.image.length) {
        throw new Error('INVALID_INPUT_PARAMETER');
      }

      // Info (20240504 - Murky): 圖片會先被存在本地端，然後才讀取路徑後轉傳給AICH
      const imageContent = await fs.readFile(files.image[0].filepath);
      const imageBlob = new Blob([imageContent], { type: files.image[0].mimetype || undefined });
      const imageName = files.image[0].filepath.split('/').pop() || 'unknown';

      const formData = new FormData();
      formData.append('image', imageBlob);
      formData.append('imageName', imageName);

      const result = await fetch(`${AICH_URI}/api/v1/ocr/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!result.ok) {
        throw new Error('GATEWAY_TIMEOUT');
      }

      const resultJson: IAccountResultStatus[] = (await result.json()).payload;

      res.status(200).json({
        powerby: `ISunFa api ${version}`,
        success: true,
        code: String(200),
        message: 'upload {numberOfImage} images sucessfully',
        payload: resultJson,
      });
    } else {
      throw new Error('METHOD_NOT_ALLOWED');
    }
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
