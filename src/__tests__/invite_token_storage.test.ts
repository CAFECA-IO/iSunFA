import { describe, it, expect, beforeEach } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import {
  forgetInviteToken,
  INVITE_NOT_FOUND_ERROR_CODE,
  INVITE_TOKEN_STORAGE_KEY,
  isInviteDefinitelyInvalid,
  rememberInviteToken,
  resolveInviteToken,
  type ITokenStorage,
} from "@/lib/team/invite_token_storage";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

/**
 * Info: (20260818 - Luphia) 落地頁取得 token 的規則（PR #6652 第五輪 T-9）。
 *
 * 這段邏輯原本埋在 `app/invite/page.tsx` 的 `useEffect` 裡，而本 repo 沒有元件
 * 測試環境——**刪掉 sessionStorage 回讀那幾行，沒有任何測試會紅**，
 * 而症狀是「按 F5 或取消 passkey 對話框之後，邀請就失效了」。
 *
 * 抽成純函式之後用一個假的 Storage 就測得完，不需要 jsdom：
 * 要證明的是規則，不是 React 的行為。
 */

function fakeStorage(initial: Record<string, string> = {}): ITokenStorage & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

const TOKEN = "a".repeat(64);
let storage: ReturnType<typeof fakeStorage>;

beforeEach(() => {
  storage = fakeStorage();
});

describe("resolveInviteToken", () => {
  it("hash 優先：剛從信裡點進來的那一把", () => {
    storage.data[INVITE_TOKEN_STORAGE_KEY] = "b".repeat(64);

    expect(resolveInviteToken(`#${TOKEN}`, storage)).toEqual({
      token: TOKEN,
      source: "hash",
    });
  });

  it("沒有 `#` 前綴也讀得到", () => {
    expect(resolveInviteToken(TOKEN, storage).token).toBe(TOKEN);
  });

  /**
   * Info: (20260818 - Luphia) 本檔最重要的一條：**沒有 hash 時要回讀備援**。
   *
   * hash 一取到就被 `replaceState` 抹掉（不留在可分享的網址裡），
   * 因此重新整理之後只剩備援。少了這條回讀，F5 就等於連結失效——
   * 使用者得回信箱重點一次。
   */
  it("沒有 hash 時回讀本分頁的備援", () => {
    storage.data[INVITE_TOKEN_STORAGE_KEY] = TOKEN;

    expect(resolveInviteToken("", storage)).toEqual({
      token: TOKEN,
      source: "storage",
    });
  });

  it("只有 `#` 視為沒有 hash", () => {
    storage.data[INVITE_TOKEN_STORAGE_KEY] = TOKEN;

    expect(resolveInviteToken("#", storage).source).toBe("storage");
  });

  it("兩邊都沒有時回 none", () => {
    expect(resolveInviteToken("", storage)).toEqual({
      token: null,
      source: "none",
    });
  });

  // Info: (20260818 - Luphia) 備援是空白字串時等同沒有，避免把空 token 送去查詢
  it("備援是空白時視為沒有", () => {
    storage.data[INVITE_TOKEN_STORAGE_KEY] = "   ";

    expect(resolveInviteToken("", storage).token).toBeNull();
  });

  // Info: (20260818 - Luphia) 讀取本身不得有副作用：抹網址與寫備援由呼叫端決定
  it("不會自己動到 storage", () => {
    resolveInviteToken(`#${TOKEN}`, storage);

    expect(storage.data).toEqual({});
  });
});

describe("rememberInviteToken / forgetInviteToken", () => {
  it("記下來之後讀得回來", () => {
    rememberInviteToken(storage, TOKEN);

    expect(resolveInviteToken("", storage).token).toBe(TOKEN);
  });

  /**
   * Info: (20260818 - Luphia) 三種終局都要清：接受、拒絕、連結失效。
   * 少了「失效」那一種，一封已經沒用的邀請會留著，使用者按上一頁又會重試一次。
   */
  it("清掉之後就讀不到了", () => {
    rememberInviteToken(storage, TOKEN);
    forgetInviteToken(storage);

    expect(resolveInviteToken("", storage).token).toBeNull();
  });
});

/**
 * Info: (20260818 - Luphia) 暫時性失敗不得毀掉連結（第六輪第 3 條）。
 *
 * 落地頁先前把**任何**不成功都判成連結失效，並清掉唯一那份 token 備援
 * （網址上的 hash 早已抹掉）。於是 429（多人共用同一個對外 IP、該分鐘配額用完）、
 * 5xx、網路瞬斷都會讓一封**仍然有效**的邀請永久失效，連 F5 都救不回來。
 */
describe("isInviteDefinitelyInvalid", () => {
  it("只有「邀請不存在／已失效」才算確定", () => {
    expect(isInviteDefinitelyInvalid(INVITE_NOT_FOUND_ERROR_CODE)).toBe(true);
  });

  it("限流、伺服器錯誤、沒有錯誤碼都算暫時性", () => {
    for (const code of [
      API_ERRORS.IS_RATE_LIMITED.code,
      API_ERRORS.IS_UNKNOWN.code,
      undefined,
      null,
      "",
    ]) {
      expect(isInviteDefinitelyInvalid(code)).toBe(false);
    }
  });

  /**
   * Info: (20260818 - Luphia) 這個模組刻意不從 `error_dictionary` 匯入那個碼——
   * 它是 client component 的相依，而整份錯誤字典不該進 client bundle。
   * 代價是同一個值寫在兩處，因此這一條把它們釘在一起。
   */
  it("重述的錯誤碼與字典一致", () => {
    expect(INVITE_NOT_FOUND_ERROR_CODE).toBe(
      API_ERRORS.NO_INVITATION_NOT_FOUND_OR_NO.code,
    );
  });
});

/**
 * Info: (20260818 - Luphia) 頁面要真的用這些函式（第五輪 T-9）。
 *
 * 規則有測試了，但頁面仍可能繞過它們自己讀 `sessionStorage`——那就回到原點。
 * 這一段釘住「規則只有一份」：頁面不得自己碰儲存或解析 hash。
 */
describe("落地頁只透過這個模組取得 token", () => {
  const page = readFileSync(
    join(process.cwd(), "src", "app", "invite", "page.tsx"),
    "utf8",
  );

  it("用的是 resolveInviteToken，而不是自己解析 hash", () => {
    expect(page).toMatch(/resolveInviteToken\(/);
    expect(page).not.toMatch(/location\.hash\.replace/);
  });

  it("寫入與清除都走這個模組", () => {
    expect(page).toMatch(/rememberInviteToken\(/);
    expect(page).toMatch(/forgetInviteToken\(/);
    expect(page).not.toMatch(/sessionStorage\.(setItem|removeItem|getItem)/);
  });

  /**
   * Info: (20260818 - Luphia) 失敗的分類要走 `isInviteDefinitelyInvalid`（第六輪第 3 條）。
   * 頁面若自己判斷（例如看 HTTP 狀態），就又回到「暫時性失敗毀掉連結」那條路。
   */
  it("失敗分類走這個模組，且有可重試的狀態", () => {
    expect(page).toMatch(/isInviteDefinitelyInvalid\(/);
    expect(page).toMatch(/"RETRYABLE"/);
    // Info: (20260818 - Luphia) 清備援只發生在 INVALID，不在 RETRYABLE
    expect(page).toMatch(/status === "INVALID"[\s\S]{0,120}forgetInviteToken/);
  });
});
