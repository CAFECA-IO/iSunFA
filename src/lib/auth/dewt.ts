import { SignJWT, jwtVerify, importPKCS8, exportJWK, importJWK } from 'jose';
import type { JWTPayload, KeyObject, CryptoKey, JWK } from 'jose';
import { webAuthnRepo } from '@/repositories/webauthn.repo';
import { logger } from '@/lib/utils/logger';
import { AppError } from '@/lib/utils/error';
import { ApiCode } from '@/lib/utils/status';
import { User } from '@/generated/client';

const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const PEM_PRIVATE_KEY = process.env.DEWT_PRIVATE_KEY_PEM;

// Info: (20251223 - Tzuhan) 移除強制的 process.exit，避免在庫中直接殺死進程，改為拋出錯誤
if (!PEM_PRIVATE_KEY) {
  logger.warn('DEWT_PRIVATE_KEY_PEM environment variable is not set. Auth will fail until configured.');
}

const DEWT_ALG = 'ES256';
const DEWT_ISSUER = origin;
const DEWT_AUDIENCE = origin;
const DEWT_EXPIRATION_TIME = process.env.DEWT_EXPIRATION_TIME ?? '24h';

interface ILoadedKeys {
  privateKey: KeyObject | CryptoKey;
  publicKey: KeyObject | CryptoKey;
}

let loadedKeys: ILoadedKeys | null = null;

async function loadKeys(): Promise<ILoadedKeys> {
  if (loadedKeys) return loadedKeys;

  if (!PEM_PRIVATE_KEY) {
    throw new AppError(
      ApiCode.INTERNAL_SERVER_ERROR,
      'Server configuration error: Missing Private Key'
    );
  }

  try {
    const privateKey = await importPKCS8(PEM_PRIVATE_KEY, DEWT_ALG, { extractable: true });
    const privateJwk = await exportJWK(privateKey);
    const publicJwk: JWK = {
      kty: privateJwk.kty,
      crv: privateJwk.crv,
      x: privateJwk.x,
      y: privateJwk.y,
    };
    const publicKey = (await importJWK(publicJwk, DEWT_ALG)) as KeyObject | CryptoKey;

    loadedKeys = { privateKey, publicKey };
    return loadedKeys;
  } catch (error) {
    logger.error(`Failed to load keys: ${JSON.stringify(error)}`);
    throw new AppError(ApiCode.INTERNAL_SERVER_ERROR, 'Failed to load cryptographic keys');
  }
}

export const signDeWT = async (user: User): Promise<string> => {
  const { privateKey } = await loadKeys();

  // Info: (20251223 - Tzuhan) Payload 包含前端需要的基礎資訊
  const payload = {
    sub: user.id,
    address: user.address,
    role: user.role,
    scope: ['user'],
    pubKeyX: user.pubKeyX,
    pubKeyY: user.pubKeyY,
  };

  const dewt = await new SignJWT(payload)
    .setProtectedHeader({ alg: DEWT_ALG })
    .setIssuer(DEWT_ISSUER)
    .setAudience(DEWT_AUDIENCE)
    .setExpirationTime(DEWT_EXPIRATION_TIME)
    .setIssuedAt()
    .sign(privateKey);

  return dewt;
};

export const verifyDeWT = async (dewt: string): Promise<JWTPayload> => {
  const { publicKey } = await loadKeys();
  try {
    const { payload } = await jwtVerify(dewt, publicKey, {
      issuer: DEWT_ISSUER,
      audience: DEWT_AUDIENCE,
    });
    return payload;
  } catch (error) {
    logger.error(`DeWT verification failed: ${JSON.stringify(error)}`);
    throw new AppError(ApiCode.UNAUTHORIZED, 'Invalid or expired token');
  }
};

export const getIdentityFromDeWT = async (
  authHeader: string | null | undefined
): Promise<User | null> => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const dewt = authHeader.substring(7);
  try {
    const payload = await verifyDeWT(dewt);
    const userId = payload.sub;

    if (!userId) return null;

    // Info: (20251223 - Tzuhan) 使用 Repo 查找用戶
    return await webAuthnRepo.findUserById(userId);
  } catch (error) {
    logger.error(`Token verification failed: ${JSON.stringify(error)}`);
    return null;
  }
};
