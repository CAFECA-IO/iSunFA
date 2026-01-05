import { NextApiRequest, NextApiResponse } from 'next';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { getSession } from '@/lib/utils/session';
import { checkRequestData, checkUserAuthorization, logUserAction } from '@/lib/utils/middleware';
import { formatApiResponse } from '@/lib/utils/common';
import { HTTP_STATUS } from '@/constants/http';
import { STATUS_MESSAGE } from '@/constants/status_code';
import loggerBack from '@/lib/utils/logger_back';
import { validateOutputData } from '@/lib/utils/validator';
import { ICreateContentOptions, IFaithContent } from '@/interfaces/faith';
import { createContent, listContentsBySessionId } from '@/lib/utils/repo/faith/content.repo';

const apiNameGET = APIName.LIST_CONTENT_BY_FAITH_SESSION_ID;
const apiNamePOST = APIName.CREATE_CONTENT_IN_FAITH_SESSION;

export const dummyFaithContents: IFaithContent[] = [
  {
    id: '10000001',
    role: {
      id: '20000001',
      name: 'user',
      image: 'https://storage.cafeca.io/api/v1/file/QmWZ3tiDVhEpSfvwLaHrVeBSkk4PSerFSHkUR7c6EqoFFd',
    },
    textContent:
      '我的公司統一編號是 52650861，請幫我分析這張憑證並轉換成會計傳票\n![上傳圖片](https://storage.cafeca.io/api/v1/file/Qmayze1Lxpi7ywY3vTHh9QKaxpHaxcRFiUVX627xEDk8KF)',
    content: [],
    like: true,
    dislike: false,
    createdAt: 1756550400,
  },
  {
    id: '10000002',
    role: {
      id: '10000001',
      name: 'FAITH',
      image: 'http://storage.cafeca.io/api/v1/file/QmcitjxMBqyqDJ7vp3nq2PWwSmAmqZdkBdyZqeKLXaRgmH',
    },
    textContent:
      '好的，這張收據可以轉換成以下的會計憑證與傳票。\n\n**情境假設：**\n*   您是「買受人」方，統一編號為 52650861 的公司。\n*   此筆款項以現金支付。\n*   「電腦週邊」金額較小，通常會列為費用而非資產。在此假設入帳為「辦公用品費」。\n\n---\n\n### **會計憑證 (Accounting Voucher)**\n\n**憑證種類：** 付款傳票 (Payment Voucher) 或 轉帳傳票 (General Journal Voucher)\n**憑證號碼：** (由公司自行編列，例如：FK1140822001)\n**日期：** 中華民國114年8月22日 (西元2025年8月22日)\n**摘要：** 購置電腦週邊一批，支付德鈔電腦有限公司 光華三分公司款項，取得統一發票PU18437758。\n\n| 會計科目 (Account)       | 摘要 (Description)         | 借方金額 (Debit) | 貸方金額 (Credit) |\n| :----------------------- | :------------------------- | :--------------- | :---------------- |\n| 辦公用品費 (Office Supplies Expense) | 購置電腦週邊               | $3,969           |                   |\n| 進項稅額 (Input Tax)     | 支付營業稅                 | $199             |                   |\n| 現金 (Cash)              | 支付德鈔電腦有限公司款項 |                  | $4,168            |\n| **合計 (Total)**         |                            | **$4,168**       | **$4,168**        |\n\n**附件張數：** 1 (此收銀機統一發票)\n\n---\n\n### **傳票 (Journal Entry)**\n\n**日期：** 中華民國114年8月22日 (西元2025年8月22日)\n\n**分錄 (Journal Entry):**\n\n| 科目代號 | 會計科目 (Account)           | 借 (Debit) | 貸 (Credit) |\n| :------- | :--------------------------- | :--------- | :---------- |\n| 6XXX     | 辦公用品費 (Office Supplies Expense) | $3,969     |             |\n| 11XX     | 進項稅額 (Input Tax)         | $199       |             |\n| 1101     | &nbsp;&nbsp;&nbsp;&nbsp;現金 (Cash)          |            | $4,168      |\n\n**摘要 (Narration):** 購置電腦週邊一批，支付德鈔電腦有限公司款項，統一發票號碼PU18437758。\n\n---\n\n**說明：**\n\n1.  **日期 (Date)：** 根據收據上的「114-08-22」。中華民國114年等於西元2025年。\n2.  **買方 (Buyer)：** 根據收據「買受人：52650861」，假設這是您的公司統一編號。\n3.  **賣方 (Seller)：** 德鈔電腦有限公司 光華三分公司。\n4.  **購買項目 (Item)：** 電腦週邊 (Computer Peripherals)。\n5.  **科目選擇 (Account Selection)：**\n    *   **銷售額 $3,969**：此為商品的淨價。由於金額不算大，且為「週邊」，通常會列為「辦公用品費」或「雜項購置」等費用類科目。若金額達到公司資產化標準，則會列為「電腦設備」等資產科目並提列折舊。\n    *   **營業稅 $199**：此為進項稅額，應列入資產負債表的「進項稅額」科目，待申報營業稅時與銷項稅額互抵。\n    *   **總計 $4,168**：此為支付總額。假設以現金支付，故貸記「現金」。若為銀行轉帳或刷卡，則貸記「銀行存款」；若為賒帳，則貸記「應付帳款」。\n6.  **統一發票號碼 (Uniform Invoice Number)：** PU18437758，此為重要的憑證依據。',
    content: [],
    like: false,
    dislike: true,
    createdAt: 1756636800,
  },
];

const handleGetRequest = async (req: NextApiRequest) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = null;
  const session = await getSession(req);

  await checkUserAuthorization(apiNameGET, req, session);

  const { query } = checkRequestData(apiNameGET, req, session);

  if (!query) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // ToDo: (20251120 - Luphia) Business logic here.
  const sessionId = Number(query.session_id);
  const result = await listContentsBySessionId(sessionId);

  const { isOutputDataValid, outputData } = validateOutputData(apiNameGET, result);

  statusMessage = isOutputDataValid ? STATUS_MESSAGE.SUCCESS : STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  payload = isOutputDataValid ? outputData : null;

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

const handlePostRequest = async (req: NextApiRequest) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = null;
  const session = await getSession(req);

  await checkUserAuthorization(apiNamePOST, req, session);

  const { query, body } = checkRequestData(apiNamePOST, req, session);
  if (!body || !query) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // ToDo: (20251120 - Luphia) Business logic here.
  const { userId } = session;
  const content: ICreateContentOptions = {
    sessionId: Number(query.session_id),
    role: {
      id: userId.toString(),
      name: 'user',
      image: 'https://avatar.cafeca.io/api/v1/avatar/10000001',
    },
    content: body,
  };
  const result: IFaithContent = await createContent(content);

  const { isOutputDataValid, outputData } = validateOutputData(apiNamePOST, result);

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

  try {
    switch (method) {
      case HttpMethod.GET:
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        await logUserAction(session, APIName.LIST_CONTENT_BY_FAITH_SESSION_ID, req, statusMessage);
        break;
      case HttpMethod.POST:
        ({ response, statusMessage } = await handlePostRequest(req));
        ({ httpCode, result } = response);
        await logUserAction(session, APIName.CREATE_CONTENT_IN_FAITH_SESSION, req, statusMessage);
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

  res.status(httpCode).json(result);
}
