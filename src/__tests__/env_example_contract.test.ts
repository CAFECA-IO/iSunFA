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

const OPTIONAL_KEYS = [
  ...SYSTEM_SETTING_KEYS.map((key) => SYSTEM_SETTING_DEFINITIONS[key].envKey),
  "SECRET_VAULT_MASTER_KEY",
];

describe(".env.example contract", () => {
  it("選填參數不得以鍵值形式出現，只能寫在註解裡", () => {
    const examplePath = path.join(process.cwd(), ".env.example");
    const declared = Object.keys(parse(fs.readFileSync(examplePath, "utf8")));

    const leaked = OPTIONAL_KEYS.filter((key) => declared.includes(key));

    expect(leaked).toEqual([]);
  });
});
