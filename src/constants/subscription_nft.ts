/**
 * Info: (20260819 - Luphia) 訂閱會員卡（鏈上 NFT）的常數。
 *
 * 訂閱本身的真實來源是 `TeamSubscription`（離鏈），鏈上那張卡是**鏡像**：
 * 它讓訂閱在錢包裡看得見、可被第三方驗證，但任何權益判斷（額度、席次、扣費）
 * 一律讀 DB，不讀鏈。這個方向不能反過來——鏈上寫入會失敗、會延遲，
 * 把權益綁在它上面等於讓一次 RPC 逾時變成「方案消失」。
 *
 * 卡片合約是 `DynamicKYCMembership`（`contracts/dynamic_kyc_membership.sol`）：
 * 部署的合約集裡只有它是 ERC721，`mintCard` / `setTokenURI` 都是平台管理員角色。
 * `SubscriptionManager` 不是 NFT，而且它的 `addSubscription` 會**鑄點數**——
 * 而訂閱買到的是額度視窗、不發點數（設計書 §7），因此不走那一支。
 */

/**
 * Info: (20260819 - Luphia) 同步決策的四種結果。字串常數而非布林組合：
 * 決策要能被單測逐一釘住，也要能寫進 log 讓人看得懂當時決定了什麼。
 */
export const SUBSCRIPTION_CARD_ACTION = {
  // Info: (20260819 - Luphia) 鏈上已與 DB 一致（或免費方案且從未發卡），不需要任何交易
  NONE: "NONE",
  // Info: (20260819 - Luphia) 尚無卡片且為付費方案：鑄一張
  MINT: "MINT",
  // Info: (20260819 - Luphia) 已有卡片但內容過期（改方案、續期、席次變動、降級）：換 tokenURI
  UPDATE_URI: "UPDATE_URI",
  // Info: (20260819 - Luphia) 重試已達上限，停手等人介入（CLAUDE.md §6：不無窮迴圈）
  GIVE_UP: "GIVE_UP",
} as const;

export type SubscriptionCardAction =
  (typeof SUBSCRIPTION_CARD_ACTION)[keyof typeof SUBSCRIPTION_CARD_ACTION];

/**
 * Info: (20260819 - Luphia) 連續失敗幾次之後停手。
 *
 * 失敗原因分兩類：暫時性（RPC 抖動、nonce 撞號）與永久性（該地址被列入黑名單，
 * `mintCard` 的 `notBlacklisted` 會 revert；管理員錢包沒有 DEFAULT_ADMIN_ROLE）。
 * 前者重試會過，後者重試一百次也一樣——上限讓後者停在紀錄上而不是佔滿 worker。
 */
export const SUBSCRIPTION_CARD_MAX_SYNC_ATTEMPTS = 5;

// Info: (20260819 - Luphia) 每輪最多處理幾個團隊，避免一次掃描塞滿整個 worker 週期
export const SUBSCRIPTION_CARD_SYNC_BATCH_SIZE = 20;

// Info: (20260819 - Luphia) worker 掃描間隔：卡片不是權益，晚一分鐘出現不影響任何功能
export const SUBSCRIPTION_CARD_SYNC_INTERVAL_MS = 60_000;

/**
 * Info: (20260819 - Luphia) tokenURI 以 data URI 承載，不上 IPFS。
 *
 * 卡片的 metadata 只有方案、期間、席次這幾個欄位，而 IPFS 上傳是一個會失敗、
 * 會逾時、且事後可能取不回來的外部依賴——把它擺在鑄造的前置步驟，等於為了
 * 一段 200 位元組的 JSON 增加一整條故障路徑。data URI 讓卡片自帶內容。
 */
export const SUBSCRIPTION_CARD_URI_PREFIX = "data:application/json;base64,";

// Info: (20260819 - Luphia) metadata 的固定字樣（卡片在錢包裡的顯示名稱）
export const SUBSCRIPTION_CARD_NAME = "iSunFA Subscription";
