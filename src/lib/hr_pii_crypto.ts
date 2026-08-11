/**
 * Info: (20260811 - Julian) 人事敏感個資的欄位級加解密（AES-256-GCM，金鑰由伺服器持有）。
 *
 * ## 這裡防的是什麼、不防什麼
 *
 * 防：`pg_dump`、備份檔外洩、DBA 或維運人員直連資料庫翻表、誤上傳到共用空間的還原檔。
 * 不防：應用層本身被攻破 —— 有 API 權限的攻擊者拿得到明文，那道防線由存取稽核
 * （`AuditLogAction.READ`）與授權檢查負責，不是加密該解的問題。
 *
 * 把邊界寫在這裡是因為「加密了」很容易被讀成「安全了」。
 *
 * ## 為什麼不用 chatroom_ecies.ts
 *
 * 那支是 WebCrypto + 使用者持鑰的 E2EE，跑在瀏覽器；本模組要讓背景 Worker
 * （薪轉、勞健保申報）解得開，金鑰必須在伺服器。兩者的信任模型不同，
 * 共用實作只會讓兩邊的邊界互相污染。
 */

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "crypto";
import {
  HR_PII_ALGORITHM,
  HR_PII_BLIND_INDEX_HASH,
  HR_PII_BLIND_INDEX_PEPPER_ENV,
  HR_PII_CIPHER,
  HR_PII_CURRENT_KEY_VERSION,
  HR_PII_IV_BYTES,
  HR_PII_KEY_BYTES,
  HR_PII_KEY_ENV_PREFIX,
  HR_PII_TAG_BYTES,
  HrPiiTable,
} from "@/constants/hr_pii";

/**
 * Info: (20260811 - Julian) 金鑰缺漏／格式錯誤時拋出。
 *
 * 丟具名型別而不是原生 Error，理由同 `carbon_envelope_invariant.ts`：
 * service 層一律把 catch 到的東西轉成 `IS_DB_FAILED`(500)，
 * 但這個錯誤觸發時資料庫好得很，缺的是伺服器設定 —— 應該轉成 `IS_CONFIG_MISSING`。
 */
export class HrPiiKeyError extends Error {
  constructor(
    public readonly keyVersion: number,
    reason: string,
  ) {
    super(`HR PII key v${keyVersion}: ${reason}`);
    this.name = "HrPiiKeyError";
  }
}

// Info: (20260811 - Julian) 密文竄改或用錯代金鑰時，GCM 驗章失敗即拋出（不會回傳垃圾明文）
export class HrPiiDecryptError extends Error {
  constructor(reason: string) {
    super(`HR PII decrypt failed: ${reason}`);
    this.name = "HrPiiDecryptError";
  }
}

/**
 * Info: (20260811 - Julian) 依代次取出資料加密金鑰。
 *
 * 逐代獨立環境變數（`HR_PII_KEY_V1`、`HR_PII_KEY_V2`…）而不是一個 JSON 陣列：
 * 輪替時只需新增一個變數，舊代原封不動 —— 改動既有變數的內容
 * 正是輪替作業最容易手滑、且手滑後舊資料全部解不開的地方。
 */
function loadKey(keyVersion: number): Buffer {
  const raw = process.env[`${HR_PII_KEY_ENV_PREFIX}${keyVersion}`];
  if (!raw) {
    throw new HrPiiKeyError(keyVersion, "environment variable is not set");
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== HR_PII_KEY_BYTES) {
    // Info: (20260811 - Julian) 只回長度，不回內容 —— 錯誤訊息會進 log，金鑰不該跟著進去
    throw new HrPiiKeyError(
      keyVersion,
      `expected ${HR_PII_KEY_BYTES} bytes after base64 decode, got ${key.length}`,
    );
  }
  return key;
}

export interface IHrPiiCiphertext {
  // Info: (20260811 - Julian) base64(iv + 密文 + GCM tag)，對應 schema 的 *Cipher 欄位
  cipher: string;
  algorithm: string;
  keyVersion: number;
}

/**
 * Info: (20260812 - Luphia) 每段密文綁定它的位置（GCM 的 AAD）。
 *
 * ## 沒有 AAD 會怎樣
 *
 * `iv || 密文 || tag` 的 tag 只保證「這段密文沒被改過」，不保證「它屬於誰」。
 * 於是把員工 A 的 `national_id_cipher` 複製到員工 B 的那一列，解密會**乾淨地成功**
 * —— GCM 驗章通過，讀取端拿到 A 的身分證字號並顯示成 B 的。
 * 同理，`address_cipher` 的內容可以搬到 `phone_cipher`。
 *
 * 這不在「密文竄改」的防護範圍內，因為攻擊者沒有竄改任何一段密文，
 * 只是換了它們的位置。而本模組的威脅模型是「DBA 或維運直連資料庫」——
 * 能讀 dump 的人通常也能寫。
 *
 * ## 綁什麼
 *
 * `表名:列 id:欄位名:金鑰代次`。四者都是解密時**必然知道**的資訊
 * （正在讀哪張表的哪一列的哪一欄，代次來自同列的 `piiKeyVersion`），
 * 所以不需要額外儲存 —— AAD 不進密文，是重算出來的。
 *
 * ## 這對寫入端的要求
 *
 * `recordId` 是必填，因此新增紀錄時 **id 必須由應用程式產生**（`randomUUID()`）
 * 而不是等資料庫的 `@default(uuid())` —— 加密發生在 insert 之前。
 * repo 層照這個方式寫即可（`analysis.service`、`storage.service` 等已有先例）。
 * 選擇必填而不是選填，是因為「加密時省略、解密時帶上」會得到一個
 * 看起來像密文損毀的驗章失敗，那種錯誤沒有人查得出來。
 */
export interface IHrPiiAadContext {
  table: HrPiiTable;
  // Info: (20260812 - Luphia) 密文欄位名（例：`nationalIdCipher`）；同一列不同欄位不可互換
  field: string;
  // Info: (20260812 - Luphia) 該列的主鍵；不同列不可互換
  recordId: string;
}

const buildAad = (context: IHrPiiAadContext, keyVersion: number): Buffer =>
  Buffer.from(
    `${context.table}:${context.recordId}:${context.field}:${keyVersion}`,
    "utf8",
  );

/**
 * Info: (20260811 - Julian) 加密單一欄位。
 *
 * 回傳同時帶 algorithm 與 keyVersion，而不是只回密文字串：
 * 呼叫端若能只拿到密文就寫進 DB，就會出現「有密文卻沒有 keyVersion」的紀錄，
 * 而那正是 `hr_pii_invariant.ts` 要擋的終態。讓型別逼呼叫端一起處理三個值，
 * 比事後檢查更早一步。
 */
export function encryptPii(
  plaintext: string,
  context: IHrPiiAadContext,
  keyVersion: number = HR_PII_CURRENT_KEY_VERSION,
): IHrPiiCiphertext {
  /**
   * Info: (20260812 - Luphia) 空字串直接拒絕,不加密。
   *
   * `decryptPii` 的長度守衛是「至少要放得下 iv + tag」,而空明文的密文
   * 正好等於 iv + tag（28 bytes）—— 於是加密成功、解密卻判定 too short 而拋錯,
   * 一段自己解不開自己產物的不對稱。
   *
   * 選擇在加密端拒絕而不是放寬解密端的守衛:空字串的個資欄位沒有意義,
   * 應該寫 null。放寬守衛只會讓「表單送了空字串」這件事安靜地存進資料庫。
   */
  if (plaintext === "") {
    throw new HrPiiDecryptError(
      "refusing to encrypt an empty string; write null instead of an empty PII field",
    );
  }

  const key = loadKey(keyVersion);
  const iv = randomBytes(HR_PII_IV_BYTES);
  const cipher = createCipheriv(HR_PII_CIPHER, key, iv);
  cipher.setAAD(buildAad(context, keyVersion));

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    cipher: Buffer.concat([iv, encrypted, tag]).toString("base64"),
    algorithm: HR_PII_ALGORITHM,
    keyVersion,
  };
}

/**
 * Info: (20260811 - Julian) 解密單一欄位；keyVersion 取自該列的 piiKeyVersion，支援輪替期間新舊並存
 *
 * Info: (20260812 - Luphia) `context` 必須與加密時**完全一致**（見 IHrPiiAadContext）。
 * 不一致的表現與「用錯代金鑰」相同:GCM 驗章失敗、拋 HrPiiDecryptError,
 * 不會回傳垃圾明文。密文被搬到別的列或別的欄位時就是這個結果 —— 那正是目的。
 */
export function decryptPii(
  cipherText: string,
  context: IHrPiiAadContext,
  keyVersion: number,
): string {
  const key = loadKey(keyVersion);
  const raw = Buffer.from(cipherText, "base64");

  // Info: (20260811 - Julian) 至少要放得下 iv + tag，否則下面的 subarray 會切出空區段並在驗章時噴不相干的錯
  if (raw.length <= HR_PII_IV_BYTES + HR_PII_TAG_BYTES) {
    throw new HrPiiDecryptError(
      `ciphertext is too short to contain an IV and an auth tag (${raw.length} bytes)`,
    );
  }

  const iv = raw.subarray(0, HR_PII_IV_BYTES);
  const tag = raw.subarray(raw.length - HR_PII_TAG_BYTES);
  const body = raw.subarray(HR_PII_IV_BYTES, raw.length - HR_PII_TAG_BYTES);

  const decipher = createDecipheriv(HR_PII_CIPHER, key, iv);
  decipher.setAAD(buildAad(context, keyVersion));
  decipher.setAuthTag(tag);

  try {
    return Buffer.concat([decipher.update(body), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    // Info: (20260811 - Julian) 不透出原始訊息：GCM 驗章失敗的細節對攻擊者有用，對呼叫端沒用
    throw new HrPiiDecryptError(
      `authentication tag mismatch (key version ${keyVersion})`,
    );
  }
}

/**
 * Info: (20260811 - Julian) 身分證字號的盲索引：HMAC-SHA256(pepper, 正規化後的值)。
 *
 * 正規化（去空白、轉大寫）是必要的：`a123456789` 與 `A123456789` 是同一個人，
 * 但雜湊值不同 —— 沒有正規化，唯一約束會被大小寫繞過，等於形同虛設。
 */
export function blindIndexNationalId(nationalId: string): string {
  const pepper = process.env[HR_PII_BLIND_INDEX_PEPPER_ENV];
  if (!pepper) {
    throw new HrPiiKeyError(
      0,
      `${HR_PII_BLIND_INDEX_PEPPER_ENV} is not set; refusing to write a guessable hash`,
    );
  }

  const normalized = nationalId.trim().toUpperCase();
  return createHmac(HR_PII_BLIND_INDEX_HASH, pepper)
    .update(normalized, "utf8")
    .digest("base64");
}

/**
 * Info: (20260811 - Julian) 盲索引比對用定值時間比較。
 *
 * 一般的 `===` 會在第一個不同的位元組就返回，比對耗時洩漏了前綴正確幾碼；
 * 這在「拿著候選身分證字號逐碼試」的情境下是可利用的。
 *
 * Info: (20260812 - Luphia) **目前沒有正式呼叫端**（只有測試在用）。
 * 實務上的唯一性比對由 `@@unique([accountBookId, nationalIdHash])` 在資料庫層做,
 * 走不到這支。它是為「以身分證查員工」那條 lookup 準備的,而 repo / service 層還沒寫。
 * 留著是因為那條路徑一定會出現,而屆時最容易寫成 `===`;
 * 但在接上之前,不要誤以為它正在守什麼。
 */
export function blindIndexEquals(left: string, right: string): boolean {
  const a = Buffer.from(left, "base64");
  const b = Buffer.from(right, "base64");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
