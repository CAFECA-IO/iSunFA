import { decodeRlp, toUtf8String, toNumber, keccak256, recoverAddress } from 'ethers';
import { encodeApplyData } from '@/lib/utils/ethers/rlp';
import loggerBack from '@/lib/utils/logger_back';

// Info: (20250619 - Tzuhan) 替換成實際的 BAIFA_CERT 地址
const BAIFA_CERT = '0xBAfA000000000000000000000000000000000000';

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

    // Info: (20250619 - Tzuhan) 重建 ApplyData → ApplyHash
    const applyData = encodeApplyData(url, hashcash, timestamp);
    const applyHash = keccak256(applyData);
    loggerBack.info(`📦 [Verify] Reconstructed ApplyHash: ${applyHash}`);

    // Info: (20250619 - Tzuhan) 從 signatureHex 拆出 r, s, v
    const r = '0x' + signatureHex.slice(0, 64);
    const s = '0x' + signatureHex.slice(64, 128);
    const v = parseInt(signatureHex.slice(128, 130), 16); // Info: (20250619 - Tzuhan) recovery param

    loggerBack.info(`🔍 [Verify] Parsed Signature r/s/v:`);
    loggerBack.info(`  ↳ r: ${r}`);
    loggerBack.info(`  ↳ s: ${s}`);
    loggerBack.info(`  ↳ v: ${v}`);

    const recovered = recoverAddress(applyHash, { r, s, v });

    loggerBack.info(`✅ [Verify] Recovered Address: ${recovered}`);
    loggerBack.info(`🎯 [Verify] Expected Address (BAIFA_CERT): ${BAIFA_CERT}`);

    const isValid = recovered.toLowerCase() === BAIFA_CERT.toLowerCase();

    return { isValid, address: recovered };
  } catch (e) {
    loggerBack.error(`❌ [Verify] Error occurred: ${(e as Error).message}`);
    return { isValid: false, error: (e as Error).message };
  }
}
