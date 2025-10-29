import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IUserSetting, IUserSettingOutputGet } from '@/interfaces/user_setting';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  createUserSetting,
  getUserSettingByUserId,
  updateUserSettingById,
} from '@/lib/utils/repo/user_setting.repo';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { LocaleKey } from '@/constants/normal_setting';

const handleGetRequest: IHandleRequest<APIName.USER_SETTING_GET, IUserSettingOutputGet> = async ({
  session,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUserSettingOutputGet | null = null;

  const { userId } = session;
  const getUserSetting = await getUserSettingByUserId(userId);

  if (getUserSetting) {
    const { ...rest } = getUserSetting;
    payload = {
      ...rest,
      country: LocaleKey.tw,
    };
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  } else {
    const createdUserSetting = await createUserSetting(userId);
    if (createdUserSetting) {
      payload = {
        ...createdUserSetting,
        country: LocaleKey.tw,
      };
      statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    } else {
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }
  }

  return { statusMessage, payload };
};

const handlePutRequest: IHandleRequest<
  APIName.USER_SETTING_UPDATE,
  IUserSettingOutputGet
> = async ({ body }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUserSettingOutputGet | null = null;

  const userSettingData = body;

  try {
    const updatedUserSetting = await updateUserSettingById(userSettingData.id, userSettingData);

    if (updatedUserSetting) {
      const { ...rest } = updatedUserSetting;
      payload = {
        ...rest,
        country: LocaleKey.tw,
      };
      statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    } else {
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
    }
  } catch (error) {
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    (error as Error).message += ' - updateUserSetting failed';
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IUserSetting | null }>;
} = {
  GET: (req) => withRequestValidation(APIName.USER_SETTING_GET, req, handleGetRequest),
  PUT: (req) => withRequestValidation(APIName.USER_SETTING_UPDATE, req, handlePutRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IUserSetting | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUserSetting | null = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = null;
  } finally {
    const { httpCode, result } = formatApiResponse<IUserSetting | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
