import { Wallet, keccak256, hexlify } from 'ethers';
import { findValidHashcash } from '@/lib/utils/ethers/find_hash_cash';
import { encodeApplyData } from '@/lib/utils/ethers/rlp';
import loggerBack from '@/lib/utils/logger_back';

async function generateSignatureAndLog() {
  loggerBack.info('🔐 開始產出一組符合文件規格的 ApplySignature');

  // Info: (20250624 - Tzuhan) Step 1. 建立錢包（測試用途）
  const wallet = Wallet.createRandom();
  const { privateKey } = wallet;
  const address = await wallet.getAddress();

  loggerBack.info(`📌 地址（BAIFA_CERT）: ${address}`);
  loggerBack.info(`🔑 私鑰（測試用）: ${privateKey}`);

  // Info: (20250624 - Tzuhan) Step 2. 設定目標 URL
  const url = 'http://127.0.0.1:3000/api/v2/baifa/voucher';
  loggerBack.info(`🌐 URL: ${url}`);

  // Info: (20250624 - Tzuhan) Step 3. 找出符合 cfc 開頭的 hash
  const { hashcash, timestamp } = await findValidHashcash(url);
  loggerBack.info(`✅ 符合條件的 hashcash: ${hashcash}`);
  loggerBack.info(`⏱️ 對應 timestamp: ${timestamp}`);

  // Info: (20250624 - Tzuhan) Step 4. 建立 ApplyData
  const applyData = encodeApplyData(url, hashcash, timestamp);
  loggerBack.info(`📦 ApplyData: ${applyData}`);

  // Info: (20250624 - Tzuhan) Step 5. Hash ApplyData
  const applyHash = keccak256(applyData);
  loggerBack.info(`🔐 ApplyHash (keccak256): ${applyHash}`);

  // Info: (20250624 - Tzuhan) Step 6. 簽名 ApplyHash
  const signature = wallet.signingKey.sign(applyHash);
  const signatureHex =
    hexlify(signature.r) +
    hexlify(signature.s).slice(2) +
    signature.v.toString(16).padStart(2, '0');

  loggerBack.info(`✍️ SignatureHex: ${signatureHex}`);

  // Info: (20250624 - Tzuhan) Step 7. RLP 打包成 ApplySignature
  const rlpEncoded = encodeApplyData(signatureHex, hashcash, timestamp);

  loggerBack.info(`🔥 x-signature（RLP encoded）: ${rlpEncoded}`);

  // Info: (20250624 - Tzuhan) 結尾提示
  loggerBack.info(`🚀 請將 x-signature 加入 header 傳送至需要 internal 驗證的 API`);
  loggerBack.info(`ℹ️ headers 範例如下：`);
  loggerBack.info(`  x-signature: ${rlpEncoded}`);
  loggerBack.info(`  Content-Type: application/json`);
}

generateSignatureAndLog().catch((err) => {
  loggerBack.info(`❌ 發生錯誤: ${err.message}`);
});
