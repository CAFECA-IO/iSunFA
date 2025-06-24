import 'dotenv/config';
import { decodeRlp, toUtf8String, toNumber, keccak256, recoverAddress } from 'ethers';
import { encodeApplyData } from '@/lib/utils/ethers/rlp';
import loggerBack from '@/lib/utils/logger_back';
import { getTimestampNow } from '@/lib/utils//common';

const EXPIRE_SECONDS = 60 * 5; // Info: (20250624 - Tzuhan) 簽章有效時間（例如 5分鐘 內有效）
const MAX_FUTURE_DRIFT_SECONDS = 60; // Info: (20250624 - Tzuhan) 允許的最大時間超前（例如 60 秒）

export function verifyApplySignature(
  url: string,
  rlpEncoded: string
): {
  isValid: boolean;
  address?: string;
  error?: string;
} {
  try {
    loggerBack.info(`[Verify] Input URL: ${url}`);
    loggerBack.info(`[Verify] RLP Encoded: ${rlpEncoded}`);
    const decoded = decodeRlp(rlpEncoded);
    loggerBack.info(`[Verify] RLP decoded: ${JSON.stringify(decoded)}`);

    if (!Array.isArray(decoded) || decoded.length !== 3) {
      loggerBack.info(`⚠️ [Verify] RLP 結構錯誤`);
      return { isValid: false, error: 'RLP 結構不正確' };
    }

    const [sigRaw, hashcashRaw, timestampRaw] = decoded;

    loggerBack.info(`🧾 Decoded data:`);
    loggerBack.info(`  ↳ sigRaw: ${sigRaw}`);
    loggerBack.info(`  ↳ hashcashRaw: ${hashcashRaw}`);
    loggerBack.info(`  ↳ timestampRaw: ${timestampRaw}`);

    const signatureHex = toUtf8String(sigRaw as unknown as Uint8Array);
    const hashcash = toUtf8String(hashcashRaw as unknown as Uint8Array);
    const timestamp = toNumber(timestampRaw as unknown as Uint8Array);

    loggerBack.info(`🧾 [Verify] Decoded fields:`);
    loggerBack.info(`  ↳ SignatureHex: ${signatureHex}`);
    loggerBack.info(`  ↳ hashcash: ${hashcash}`);
    loggerBack.info(`  ↳ Timestamp: ${timestamp}`);

    const now = getTimestampNow(); // Info: (20250624 - Tzuhan) current time in seconds

    if (now - timestamp > EXPIRE_SECONDS) {
      loggerBack.info(
        `⚠️ [Verify] Timestamp 過期，簽章無效（now=${now}, timestamp=${timestamp}）, 差別: ${now - timestamp} 秒`
      );
      return { isValid: false, error: 'Signature expired' };
    }

    if (timestamp > now + MAX_FUTURE_DRIFT_SECONDS) {
      loggerBack.info(`⚠️ [Verify] Timestamp 超前現在時間太多，疑似偽造`);
      return { isValid: false, error: 'Timestamp too far in future' };
    }

    // Info: (20250619 - Tzuhan) 重建 ApplyData → ApplyHash
    const applyData = encodeApplyData(url, hashcash, timestamp);
    loggerBack.info(`📦 [Verify] Reconstructed ApplyData: ${applyData}`);
    const applyHash = keccak256(applyData);
    loggerBack.info(`📦 [Verify] Reconstructed ApplyHash: ${applyHash}`);

    // Info: (20250624 - Tzuhan) 從 signatureHex 拆出 r, s, v
    const signatureHexClean = signatureHex.startsWith('0x') ? signatureHex.slice(2) : signatureHex;

    const r = '0x' + signatureHexClean.slice(0, 64);
    const s = '0x' + signatureHexClean.slice(64, 128);
    const v = parseInt(signatureHexClean.slice(128, 130), 16); // Info: (20250619 - Tzuhan) recovery param

    loggerBack.info(`🔍 [Verify] Parsed Signature r/s/v:`);
    loggerBack.info(`  ↳ r: ${r}`);
    loggerBack.info(`  ↳ s: ${s}`);
    loggerBack.info(`  ↳ v: ${v}`);

    const recovered = recoverAddress(applyHash, { r, s, v });

    loggerBack.info(`✅ [Verify] Recovered Address: ${recovered}`);
    loggerBack.info(`🎯 [Verify] [ENV] BAIFA_CERT from env: ${process.env.BAIFA_CERT}`);

    const isValid = recovered.toLowerCase() === (process.env.BAIFA_CERT || '').toLowerCase();

    return { isValid, address: recovered };
  } catch (e) {
    loggerBack.error(`❌ [Verify] Error occurred: ${(e as Error).message}`);
    return { isValid: false, error: (e as Error).message };
  }
}
