import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { WalletCustodyType } from "@/constants/auth_provider";
import { resolveCustodyType } from "@/lib/auth/user_approval";
import { derivePurposeSecret, VaultPurpose } from "@/lib/auth/key_vault";
import { CUSTODIAL_PRF_VERSION } from "@/constants/chatroom_key";

/**
 * Info: (20260812 - Luphia) 託管帳號的 PRF 替身。
 *
 * ## 為什麼需要這支
 *
 * 端到端加密的主私鑰由 WebAuthn PRF 派生的秘密包裝（見 `chatroom_key_manager`）。
 * PRF 的輸出來自驗證器本身，**伺服器產不出來** —— 而託管帳號沒有 passkey，
 * 於是 `navigator.credentials.get()` 會開出一個永遠不可能成功的系統對話框。
 * ADR 016 早就記下這個限制（負面第 3 條），開的藥方是「引導使用者補綁 passkey」，
 * 而那個功能到現在還不存在，所以那些帳號完全用不了加密對話。
 *
 * 這支提供同等功能的替身：以保險庫主密鑰為根，派生一段**決定性**的 32 bytes 秘密，
 * 讓包裝／解包主私鑰的流程完全不必分岔 —— 前端統一呼叫 `requestPrfSecret()`，
 * passkey 走驗證器、託管走這支。
 *
 * ## 這件事的代價必須說清楚
 *
 * 秘密由伺服器派生，**因此伺服器有能力解開託管帳號的對話內容**。
 * 這與託管錢包本來的信任模型一致（平台已經持有他們的簽章私鑰），
 * 但它確實不是 passkey 帳號那種「伺服器連解密的能力都沒有」。
 * 因此託管帳號的介面文案不得沿用同一句保證（見 carbon_chatbot 的 unlock 提示）。
 *
 * 影響半徑也跟著綁在主密鑰上：`SECRET_VAULT_MASTER_KEY` 遺失，
 * 託管帳號的對話與託管錢包一起失效。這一點與既有的託管私鑰相同，不是新增的風險。
 *
 * ## 為什麼不用託管私鑰本身派生
 *
 * 那會讓「解開對話」與「動用資金」共用同一份金鑰材料，兩者的外洩後果完全不同；
 * 而且為了加密而去解封簽章私鑰，等於為不相干的用途擴大它的暴露面。
 * 改以 `VaultPurpose.CUSTODIAL_PRF` 做 domain separation —— 那正是 purpose 存在的理由。
 */
export class CustodialPrfService {
  /**
   * Info: (20260812 - Luphia) 取得某使用者在某個 salt 下的 PRF 替身秘密。
   *
   * `userId` 與 `prfSalt` 都進 HMAC 的輸入：
   * - 少了 `userId`，同一個 salt 會讓所有託管帳號共用同一個秘密。
   * - 少了 `prfSalt`，主金鑰換包（重新註冊）就拿不到新的秘密，
   *   而 salt 正是 `chatroom_key_manager` 用來區分「這一份包裝」的東西。
   */
  public async derive(params: {
    userId: string;
    prfSalt: string;
  }): Promise<string> {
    /**
     * Info: (20260812 - Luphia) passkey 帳號一律拒絕。
     *
     * 他們的秘密只該由自己的驗證器產生;讓這支對 passkey 帳號也回傳值,
     * 等於提供一條「把非託管帳號降級成伺服器可解密」的路徑,
     * 而呼叫端只要少傳一個 custody 參數就會踩到。在伺服器擋，不靠前端自律。
     */
    const custody = await resolveCustodyType(params.userId);
    if (custody !== WalletCustodyType.CUSTODIAL) {
      throw new AppError(API_ERRORS.AUTH_PERMISSION_DENIED);
    }

    /**
     * Info: (20260812 - Luphia) 綁 salt 的 **bytes**,不是它的 base64 字串（PR review P-3）。
     *
     * 另一條路徑吃的是 bytes（`getPrfSecret(base64ToBytes(prfSalt))`）,
     * 這裡若綁字串表示,兩條路徑對 salt 的敏感點就不同 —— 任何編碼上的改動
     * (base64 → base64url、去 padding、trim、一次正規化的遷移) 都會換掉秘密,
     * 而**失敗方式是不對稱的**:passkey 帳號解碼成 bytes 所以毫無症狀,
     * 只有託管帳號的對話永久解不開,而且要等改動上線之後才發現。
     *
     * 以長度前綴串接而不是用 `:` 分隔（PR review nit）:userId 今天是固定格式的 uuid
     * 所以無歧義,但前綴長度一旦不固定就有碰撞面。長度前綴讓框界不依賴內容。
     *
     * 版本字串也進輸入（P-5）:標記換版時派生出來的秘密必須跟著換,
     * 否則 `algorithm` 裡的版本只是註解。
     */
    const userIdBytes = Buffer.from(params.userId, "utf8");
    const saltBytes = Buffer.from(params.prfSalt, "base64");
    const versionBytes = Buffer.from(CUSTODIAL_PRF_VERSION, "utf8");
    const framing = Buffer.alloc(8);
    framing.writeUInt32BE(versionBytes.length, 0);
    framing.writeUInt32BE(userIdBytes.length, 4);

    const secret = derivePurposeSecret(
      VaultPurpose.CUSTODIAL_PRF,
      Buffer.concat([framing, versionBytes, userIdBytes, saltBytes]),
    );
    return secret.toString("base64");
  }
}

export const custodialPrfService = new CustodialPrfService();
