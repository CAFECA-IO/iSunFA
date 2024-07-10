import { utils } from '@passwordless-id/webauthn';
import { ICredential } from '@/interfaces/webauthn';
import { ONE_MINUTE_IN_S } from '@/constants/time';
import { timestampInSeconds } from './common';

export async function createChallenge() {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const expiredAt = nowTimestamp + ONE_MINUTE_IN_S * 3;
  const expiredAtStr = expiredAt.toString();
  const random = utils.randomChallenge();
  const randomBuffer = utils.toBuffer(random);
  const expiredBuffer = utils.toBuffer(expiredAtStr);
  const challengeBuffer = utils.concatenateBuffers(expiredBuffer, randomBuffer);
  let challenge = utils.toBase64url(challengeBuffer);
  challenge = challenge.replace(/=/g, '');
  return challenge;
}

/**
 * 解析并验证挑战码中的时间戳是否合法。
 * @param challenge - 挑战码，Base64url 编码的字符串。
 * @returns 是否合法。
 */
export function verifyChallengeTimestamp(challenge: string): boolean {
  // 将挑战码从 Base64url 格式解码回二进制格式
  const challengeBuffer = utils.parseBase64url(challenge);

  // 假设时间戳是前10个字节（这取决于你的实现细节）
  const timeBufferLength = 10; // 或者根据实际长度调整
  const timeBuffer = challengeBuffer.slice(0, timeBufferLength);

  // 将时间戳的二进制数据转换回字符串，然后转换为数字
  const timestampString = utils.parseBuffer(timeBuffer);
  const timestamp = parseInt(timestampString, 10);

  // 获取当前时间戳（秒）
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);

  // 验证时间戳是否在合理的时间范围内
  const isValid = timestamp > nowTimestamp;

  return isValid;
}

export const checkFIDO2Cookie = (): Array<ICredential> | null => {
  const cookie = document.cookie.split('; ').find((row: string) => row.startsWith('FIDO2='));

  const FIDO2 = cookie ? cookie.split('=')[1] : null;

  if (FIDO2) {
    const decoded = decodeURIComponent(FIDO2);
    const credential = JSON.parse(decoded) as Array<ICredential>;
    return credential;
  }

  return null;
};
