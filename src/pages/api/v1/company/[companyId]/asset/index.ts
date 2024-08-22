import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IAsset, mockAssetData } from '@/interfaces/asset';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAsset | IAsset[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAsset | IAsset[] | null = null;
  try {
    switch (req.method) {
      case 'GET': {
        // let shouldContinue: boolean = true;
        // TODO: (20240625 - Jacky) checkAuth
        // TODO: (20240625 - Jacky) listContract
        const assetList = mockAssetData;
        statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
        payload = assetList;
        break;
      }
      case 'POST': {
        // let shouldContinue: boolean = true;
        // TODO: (20240625 - Jacky) checkAuth
        // TODO: (20240625 - Jacky) createContract
        const asset: IAsset = mockAssetData[0];
        statusMessage = STATUS_MESSAGE.CREATED;
        payload = asset;
        break;
      }
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        payload = {} as IAsset;
        break;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = {} as IAsset;
  }
  const { httpCode, result } = formatApiResponse<IAsset | IAsset[]>(statusMessage, payload);
  res.status(httpCode).json(result);
}
