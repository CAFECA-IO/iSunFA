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
import { EventType, PaymentPeriodType, PaymentStatusType } from '@/constants/account';

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
      const invoices: IInvoice[] = [
        {
          date: 21321321,
          invoiceId: '123123',
          eventType: EventType.Payment,
          paymentReason: 'purchase',
          description: 'description',
          venderOrSupplyer: 'vender',
          project: 'ISunFa',
          contract: 'ISunFa buy',
          projectId: '123',
          contractId: '123',
          payment: {
            isRevenue: false,
            price: 1500,
            hasTax: true,
            taxPercentage: 10,
            hasFee: true,
            fee: 10,
            paymentMethod: 'transfer',
            paymentPeriod: PaymentPeriodType.AtOnce,
            installmentPeriod: 0,
            paymentAlreadyDone: 1500,
            paymentStatus: PaymentStatusType.Paid,
            progress: 0,
          },
        },
        {
          invoiceId: '2',
          date: 123123123,
          eventType: EventType.Payment,
          paymentReason: 'sale',
          description: 'description',
          venderOrSupplyer: 'vender',
          project: 'ISunFa',
          contract: 'ISunFa buy',
          projectId: '123',
          contractId: '123',
          payment: {
            isRevenue: false,
            price: 100,
            hasTax: true,
            taxPercentage: 10,
            hasFee: true,
            fee: 10,
            paymentMethod: 'transfer',
            paymentPeriod: PaymentPeriodType.AtOnce,
            installmentPeriod: 0,
            paymentAlreadyDone: 110,
            paymentStatus: PaymentStatusType.Paid,
            progress: 0,
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
      let fields: formidable.Fields;
      try {
        const parsedForm = await parseForm(req);
        files = parsedForm.files;
        fields = parsedForm.fields;
      } catch (error) {
        throw new Error(STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR);
      }

      // Info (20240504 - Murky): fields會長會這樣
      // fields {
      //   project: [ '我的project' ],
      //   projectId: [ 'project001' ],
      //   contract: [ '我的contract' ],
      //   contractId: [ 'contractId' ]
      // }
      if (
        !files ||
        !files.image ||
        !files.image.length ||
        !fields ||
        !fields.project ||
        !fields.projectId ||
        !fields.contract ||
        !fields.contractId ||
        !Array.isArray(fields.project) ||
        !Array.isArray(fields.projectId) ||
        !Array.isArray(fields.contract) ||
        !Array.isArray(fields.contractId) ||
        !fields.project.length ||
        !fields.projectId.length ||
        !fields.contract.length ||
        !fields.contractId.length ||
        !(typeof fields.project[0] === 'string') ||
        !(typeof fields.projectId[0] === 'string') ||
        !(typeof fields.contract[0] === 'string') ||
        !(typeof fields.contractId[0] === 'string')
      ) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_FORMDATA_IMAGE);
      }

      // Info (20240504 - Murky): 圖片會先被存在本地端，然後才讀取路徑後轉傳給AICH
      const imageContent = await fs.readFile(files.image[0].filepath);
      const imageBlob = new Blob([imageContent], { type: files.image[0].mimetype || undefined });
      const imageName = files.image[0].filepath.split('/').pop() || 'unknown';

      const formData = new FormData();
      formData.append('image', imageBlob);
      formData.append('imageName', imageName);
      formData.append('project', fields.project[0]);
      formData.append('projectId', fields.projectId[0]);
      formData.append('contract', fields.contract[0]);
      formData.append('contractId', fields.contractId[0]);

      let fetchResult: Response;
      try {
        fetchResult = await fetch(`${AICH_URI}/api/v1/ocr/upload`, {
          method: 'POST',
          body: formData,
        });
      } catch (error) {
        throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
      }

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
