import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import { parse } from "dotenv";
import {
  SYSTEM_SETTING_DEFINITIONS,
  SYSTEM_SETTING_KEYS,
} from "@/constants/system_setting";

/**
 * Info: (20260811 - Luphia) 守住 .env.example 的一條隱性契約。
 *
 * validateEnvDetailed() 把 .env.example 裡出現的每一個鍵都當成「必填」：
 * 只要某個鍵在 example 裡有、在部署的 .env 裡沒有，validateEnv() 就回 false，
 * 系統進入「尚未初始化」狀態，部署精靈重新開啟——而那條路徑在該狀態下沒有身分驗證。
 *
 * 由資料庫保管的設定（Google OAuth、Gemini 金鑰、金流憑證）與保險庫主密鑰都是選填的，
 * 因此只能以註解形式記載在 .env.example，不能寫成鍵值。
 *
 * 這個約定原本只存在於一行文件裡。半年後有人為了「讓 .env.example 更完整」把
 * GOOGLE_OAUTH_CLIENT_ID= 加回去，所有既有部署下次重啟就會全部掉進初始化狀態——
 * code review 看不出來、CI 不會紅、上線才炸。所以把它變成一個測試。
 */

/**
 * Info: (20260812 - Luphia) 人事個資金鑰也納入這條契約。
 *
 * 它們與 SECRET_VAULT_MASTER_KEY 同一類:保護 DB 內容、必須留在 env、
 * 但**對整個系統是選填的** —— 未設定時只有人事模組不可用,其餘功能不受影響。
 * 因此不能寫成鍵值,否則既有部署升級後會全部掉進「尚未初始化」狀態。
 *
 * 原本這兩個 key 不在清單裡,所以這支測試抓不到它們 —— 風險一模一樣,
 * 只是少了機制。列進來之後，下一個想「把 .env.example 補完整」的人會被 CI 擋下。
 */
const HR_PII_KEYS = ["HR_PII_KEY_V1", "HR_PII_BLIND_INDEX_PEPPER"];

/**
 * Info: (20260814 - Julian) 簽到 Demo 的 seed 輸入參數也納入這條契約。
 *
 * 它們與上面兩類的共同點只有一個：**對整個系統是選填的**。
 * 差別在於它們連執行期都不參與 —— 只有 `seed_attendance_demo.ts` 會讀，跑完就用完了。
 * 但「寫成鍵值就會讓既有部署掉進未初始化狀態」這個後果一模一樣，所以同樣只能寫在註解裡。
 */
const ATTENDANCE_DEMO_KEYS = [
  "DEMO_SITE_A_LAT",
  "DEMO_SITE_A_LNG",
  "DEMO_SITE_A_RADIUS",
  "DEMO_EMAIL_EMP005",
  "DEMO_EMAIL_EMP006",
];

/**
 * Info: (20260817 - Luphia) 限流閾值也納入這條契約。
 *
 * 它們是**部署時調參用的旋鈕**：未設定時生效值來自 `src/constants/rate_limit.ts`
 * 的程式內預設（`envInt(name, fallback)`），因此對整個系統是選填的 ——
 * 與上面三類的共同點就是這個，而寫成鍵值的後果一模一樣。
 *
 * 這一組原本不在清單裡（`CARBON_RL_*` 從 #6516 起就沒有被守住），
 * 風險與其他選填 env 完全相同，只是少了機制。一次補齊而不只補新加的那六個：
 * 只補自己這一批，等於留下一份「看起來完整」的清單。
 *
 * ToDo: (20260817 - Luphia) 這份清單是手抄的，`envInt()` 的鍵名寫在呼叫處的字串裡，
 * 兩邊會分岔。理想做法是讓 `rate_limit.ts` 匯出一份 env 鍵名清單，由本測試讀取。
 */
const RATE_LIMIT_KEYS = [
  "CARBON_RL_LLM_PER_MINUTE",
  "CARBON_RL_LLM_PER_DAY",
  "CARBON_RL_UPLOAD_PER_HOUR",
  "CARBON_RL_UPLOAD_PER_DAY",
  "CARBON_RL_READ_PER_MINUTE",
  "CARBON_RL_SAVE_PER_MINUTE",
  "FAITH_RL_GUEST_PER_MINUTE",
  "FAITH_RL_GUEST_PER_DAY",
  "SIGNING_RL_PER_MINUTE",
  "SIGNING_RL_PER_DAY",
  "PRF_RL_PER_MINUTE",
  "PRF_RL_PER_DAY",
  "ATTENDANCE_RL_PUNCH_PER_MINUTE",
  "ATTENDANCE_RL_PUNCH_PER_DAY",
  "ATTENDANCE_RL_WRITE_PER_MINUTE",
  "ATTENDANCE_RL_WRITE_PER_DAY",
  "ATTENDANCE_RL_EXPORT_PER_MINUTE",
  "ATTENDANCE_RL_EXPORT_PER_DAY",
];

const OPTIONAL_KEYS = [
  ...SYSTEM_SETTING_KEYS.map((key) => SYSTEM_SETTING_DEFINITIONS[key].envKey),
  "SECRET_VAULT_MASTER_KEY",
  ...HR_PII_KEYS,
  ...ATTENDANCE_DEMO_KEYS,
  ...RATE_LIMIT_KEYS,
];

describe(".env.example contract", () => {
  it("選填參數不得以鍵值形式出現，只能寫在註解裡", () => {
    const examplePath = path.join(process.cwd(), ".env.example");
    const declared = Object.keys(parse(fs.readFileSync(examplePath, "utf8")));

    const leaked = OPTIONAL_KEYS.filter((key) => declared.includes(key));

    expect(leaked).toEqual([]);
  });
});
