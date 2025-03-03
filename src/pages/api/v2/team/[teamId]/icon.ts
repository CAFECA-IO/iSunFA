import { NextApiRequest, NextApiResponse } from 'next';

/**
 * 開發步驟：
 * 1. 在 APIName enum 中添加 TEAM_PUT_ICON 類型
 * 2. 在 APIPath enum 中添加 TEAM_PUT_ICON 對應的路徑
 * 3. 在 AUTH_CHECK 中註冊 TEAM_PUT_ICON API 並設定所需的權限檢查
 * 4. 在 ZOD_SCHEMA_API 中註冊 TEAM_PUT_ICON API 的 Schema
 * 5. 創建 ITeamWithImage 介面，用於定義 team 與圖片的關聯
 * 6. 實作 putTeamIcon 函數，用於更新 team 的圖片 ID
 * 7. 使用 withRequestValidation 中間件處理授權檢查
 * 8. 實作 handlePutRequest 函數，處理 PUT 請求
 */

import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';
import { loggerError } from '@/lib/utils/logger_back';

// 定義 Team 與 File 的關聯介面
interface ITeamWithImage {
  id: number;
  name: string;
  imageId: number;
  imageFile: IFile;
  createdAt: number;
  updatedAt: number;
}

// 定義 File 介面
interface IFile {
  id: number;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  type: string;
  createdAt: number;
  updatedAt: number;
}

const handlePutRequest: IHandleRequest<APIName.PUT_TEAM_ICON, ITeamWithImage> = async ({
  query,
  body,
  session,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITeamWithImage | null = null;

  const { teamId } = query;
  const { fileId } = body;
  const { userId } = session;

  try {
    // 注意：這是 mock 實作，實際開發時需要調用 putTeamIcon 函數
    // const updatedTeam = await putTeamIcon({ teamId, fileId });

    // 模擬成功更新 team 圖示的情況
    const mockTeam: ITeamWithImage = {
      id: Number(teamId),
      name: `Team ${teamId}`,
      imageId: Number(fileId),
      imageFile: {
        id: Number(fileId),
        name: `team_picture_${fileId}.jpg`,
        size: 123456,
        mimeType: 'image/jpeg',
        url: `https://storage.googleapis.com/isunfa-images/team/team_picture_${fileId}.jpg`,
        type: 'team',
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime(),
      },
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
    };

    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    payload = mockTeam;
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId,
      errorType: error.name,
      errorMessage: error.message,
    });
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: ITeamWithImage | null }>;
} = {
  PUT: (req) => withRequestValidation(APIName.PUT_TEAM_ICON, req, handlePutRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ITeamWithImage | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITeamWithImage | null = null;

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
    const { httpCode, result } = formatApiResponse<ITeamWithImage | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
