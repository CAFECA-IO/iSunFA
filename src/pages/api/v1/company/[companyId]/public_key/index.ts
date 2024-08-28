import type { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/session';
import { checkAuthorization } from '@/lib/utils/auth_check';
import logger from '@/lib/utils/logger';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import {
  exportPublicKey,
  getPublicKeyByCompany,
  encrypt,
  decrypt,
  getPrivateKeyByCompany,
} from '@/lib/utils/crypto';

async function verifyKeyPair(publicKey: CryptoKey, privateKey: CryptoKey) {
  try {
    const message = 'test message';

    // 使用公钥加密消息
    const encryptedMessage = await encrypt(message, publicKey);

    // 使用私钥解密消息
    const decryptedMessage = await decrypt(encryptedMessage, privateKey);

    // 验证解密后的消息是否与原始消息匹配
    return decryptedMessage === message;
  } catch (error) {
    /* eslint-disable no-console */
    console.error('Verification failed:', error);
    /* eslint-enable no-console */
    return false;
  }
}

async function handleGetRequest(companyId: number): Promise<{
  payload: JsonWebKey | null;
  statusMessage: string;
}> {
  const statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  let payload: JsonWebKey | null = null;
  try {
    const publicCryptoKey = await getPublicKeyByCompany(companyId);
    const privateKey = await getPrivateKeyByCompany(companyId);
    if (!publicCryptoKey || !privateKey) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }
    /* eslint-disable no-console */
    const isSame = await verifyKeyPair(publicCryptoKey, privateKey);
    console.log('isSame', isSame);
    console.log('publicCryptoKey', publicCryptoKey);
    console.log('privateKey', privateKey);
    /* eslint-enable no-console */
    if (publicCryptoKey) {
      payload = await exportPublicKey(publicCryptoKey);
    } else {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }
  } catch (error) {
    logger.error(error);
  }
  return {
    payload,
    statusMessage,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<JsonWebKey | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: JsonWebKey | null = null;
  const session = await getSession(req, res);
  const { userId, companyId } = session;

  const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
  if (isAuth) {
    try {
      switch (req.method) {
        case 'GET': {
          const result = await handleGetRequest(companyId);
          payload = result.payload;
          statusMessage = result.statusMessage;
          break;
        }
        default:
          statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
          break;
      }
    } catch (_error) {
      const error = _error as Error;
      statusMessage = error.message;
      logger.error(error);
    }
  }
  const { httpCode, result } = formatApiResponse<JsonWebKey | null>(statusMessage, payload);
  res.status(httpCode).json(result);
}
