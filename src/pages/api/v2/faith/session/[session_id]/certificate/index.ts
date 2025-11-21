import { NextApiRequest, NextApiResponse } from 'next';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { getSession } from '@/lib/utils/session';
import { checkRequestData, checkUserAuthorization, logUserAction } from '@/lib/utils/middleware';
import { formatApiResponse } from '@/lib/utils/common';
import { HTTP_STATUS } from '@/constants/http';
import { STATUS_MESSAGE } from '@/constants/status_code';
import loggerBack from '@/lib/utils/logger_back';
import { validateOutputData } from '@/lib/utils/validator';
import { IFaithCertificate } from '@/interfaces/faith';

const apiName = APIName.LIST_CERTIFICATE_BY_FAITH_SESSION_ID;

export const dummyFaithCertificates: IFaithCertificate[] = [
  {
    id: 'cert-001',
    name: '購置電腦週邊憑證',
    description:
      '購置電腦週邊一批，支付德鈔電腦有限公司 光華三分公司款項，取得統一發票PU18437758。',
    image: 'https://storage.cafeca.io/api/v1/file/Qmayze1Lxpi7ywY3vTHh9QKaxpHaxcRFiUVX627xEDk8KF',
    taxInfo: {
      invoiceNo: 'PU18437758',
      issueDate: 1756550400,
      tradingPartner: {
        name: '德縂電腦有限公司 光華三分公司',
        taxId: '90849218',
      },
      taxType: null,
      taxRate: null,
      salesAmount: 3969,
      tax: 199,
    },
    voucherInfo: {
      voucherType: 'Payment Voucher',
      voucherNo: 'FK1140822001',
      issueDate: 1756550400,
      description:
        '購置電腦週邊一批，支付德縂電腦有限公司 光華三分公司款項，取得統一發票PU18437758。',
      lineItems: [
        {
          account: {
            name: '辦公用品費',
            code: '6XXX',
          },
          description: '購置電腦週邊',
          debit: true,
          amount: 3969,
        },
        {
          account: {
            name: '進項稅額',
            code: '11XX',
          },
          description: '支付營業稅',
          debit: true,
          amount: 199,
        },
        {
          account: {
            name: '現金',
            code: '1101',
          },
          description: '支付德縂電腦有限公司款項',
          debit: false,
          amount: 4168,
        },
      ],
      sum: {
        debit: true,
        amount: 4168,
      },
    },
  },
];

const handleGetRequest = async (req: NextApiRequest) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = null;
  const session = await getSession(req);

  await checkUserAuthorization(apiName, req, session);

  const { query } = checkRequestData(apiName, req, session);

  if (!query) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // ToDo: (20251120 - Luphia) Business logic here.
  const result = dummyFaithCertificates;

  const { isOutputDataValid, outputData } = validateOutputData(apiName, result);

  statusMessage = isOutputDataValid ? STATUS_MESSAGE.SUCCESS : STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  payload = isOutputDataValid ? outputData : null;

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  const session = await getSession(req);
  const apiName = APIName.LIST_FAITH_SESSION;

  try {
    switch (method) {
      case HttpMethod.GET:
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
        break;
    }
  } catch (error) {
    loggerBack.error(`error: ${JSON.stringify(error)}`);
    const err = error as Error;
    statusMessage = STATUS_MESSAGE[err.name as keyof typeof STATUS_MESSAGE] || err.message;
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }

  await logUserAction(session, apiName, req, statusMessage);
  res.status(httpCode).json(result);
}
