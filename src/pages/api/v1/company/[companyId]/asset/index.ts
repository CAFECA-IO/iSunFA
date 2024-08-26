import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IAsset, mockAssetData } from '@/interfaces/asset';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { getSession } from '@/lib/utils/session';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAsset | IAsset[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAsset | IAsset[] | null = null;
  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await checkAuthorization([AuthFunctionsKeys.owner], {
    userId,
    companyId,
  });

  if (isAuth) {
    try {
      switch (req.method) {
        case 'GET': {
          // ToDo: (20240625 - Jacky) [Beta] listContract
          const assetList = mockAssetData;
          statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
          payload = assetList;
          break;
        }
        case 'POST': {
          // ToDo: (20240625 - Jacky) [Beta] createContract
          const asset: IAsset = mockAssetData[0];
          statusMessage = STATUS_MESSAGE.CREATED;
          payload = asset;
          break;
        }
        default:
          statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
          break;
      }
    } catch (_error) {
      // ToDo: (20240822 - Murky) please used logger to print error
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }
  }
  const { httpCode, result } = formatApiResponse<IAsset | IAsset[] | null>(statusMessage, payload);
  res.status(httpCode).json(result);
}
