import { randomUUID } from "crypto";
import { logger } from "@/lib/utils/logger";
import { CUSTODIAL_CREDENTIAL_PREFIX } from "@/constants/auth_provider";
import { generateCustodialKeyPair } from "@/lib/auth/custodial_signer";
import { sealSecret, VaultPurpose } from "@/lib/auth/key_vault";
import { deriveAccountAddress } from "@/lib/auth/account_address";
import {
  custodialKeyRepo,
  ICustodialKeyRepository,
} from "@/repositories/custodial_key.repo";

/**
 * Info: (20260809 - Luphia) 託管錢包服務。
 *
 * 只服務「沒有 passkey」的第三方登入使用者：伺服器代管其 P-256 私鑰，
 * 並在需要時代簽。
 *
 * Info: (20261015 - Luphia) 區塊鏈退役：建帳不再部署 SCW，也不再送 bundler。
 * 位址改由 `deriveAccountAddress` 以 (credentialId, 公鑰) 鏈下推導，與 passkey 註冊同一條規則；
 * 「代為執行鏈上呼叫」（executeCall）一併移除。
 *
 * 安全邊界（重要）：
 * 1. 不提供「任意雜湊代簽」的公開端點；代簽只簽本站發出過的 challenge
 *    （見 custodial_signing.service），避免變成簽章預言機。
 *    區塊鏈退役後付款 UserOp 的代簽（buildOrderPaymentUserOp）已一併移除。
 * 2. 明文私鑰只在單次呼叫的記憶體中出現，不寫檔、不入 log。
 * 3. 使用者日後補綁 passkey 後應改用非託管路徑，並廢除此金鑰。
 */

export interface IProvisionedWallet {
  address: string;
  credentialId: string;
  pubKeyX: string;
  pubKeyY: string;
  privateKeyPem: string;
}

export class CustodialWalletService {
  constructor(private readonly keyRepo: ICustodialKeyRepository) {}

  /**
   * Info: (20260809 - Luphia) 為新的第三方登入使用者產生金鑰並建立帳號位址。
   * 回傳的 privateKeyPem 由呼叫端立刻交給 key_vault 封裝，不得外流到 API 回應。
   *
   * Info: (20261015 - Luphia) 區塊鏈退役：不再 readContract(getAddress) 與部署，
   * 位址鏈下推導（與 passkey 註冊同一支 `deriveAccountAddress`），整個過程不碰網路。
   * 回傳形狀不變（僅移除不再存在的 transactionHash）。顯示名稱與頭像原本以參數傳入、
   * 寫進鏈上 AccountCreated 事件；現在只由呼叫端存進 DB，這裡不再需要。
   */
  public async provisionWallet(): Promise<IProvisionedWallet> {
    const keyPair = generateCustodialKeyPair();
    // Info: (20260809 - Luphia) 以固定前綴 + UUID 保證與真實 passkey credential 不會碰撞
    const credentialId = `${CUSTODIAL_CREDENTIAL_PREFIX}${randomUUID()}`;

    const address = deriveAccountAddress({
      credentialId,
      pubKeyX: keyPair.pubKeyX,
      pubKeyY: keyPair.pubKeyY,
    });

    // Info: (20261015 - Luphia) 顯示名稱屬個資，不入 log
    logger.info("Custodial account provisioned", { address });

    return {
      address,
      credentialId,
      pubKeyX: keyPair.pubKeyX,
      pubKeyY: keyPair.pubKeyY,
      privateKeyPem: keyPair.privateKeyPem,
    };
  }

  // Info: (20260809 - Luphia) 供 oauth.service 在建立使用者的同一個交易內寫入金鑰密文
  public sealPrivateKey(privateKeyPem: string) {
    return sealSecret(privateKeyPem, VaultPurpose.CUSTODIAL_KEY);
  }
}

export const custodialWalletService = new CustodialWalletService(
  custodialKeyRepo,
);
