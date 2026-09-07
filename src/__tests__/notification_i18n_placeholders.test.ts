import { describe, it, expect } from "@jest/globals";
import { notification as en } from "@/i18n/locales/en/notification";
import { notification as ja } from "@/i18n/locales/ja/notification";
import { notification as ko } from "@/i18n/locales/ko/notification";
import { notification as zhCn } from "@/i18n/locales/zh_cn/notification";
import { notification as zhTw } from "@/i18n/locales/zh_tw/notification";
import { analysis as enAnalysis } from "@/i18n/locales/en/analysis";
import { analysis as jaAnalysis } from "@/i18n/locales/ja/analysis";
import { analysis as koAnalysis } from "@/i18n/locales/ko/analysis";
import { analysis as zhCnAnalysis } from "@/i18n/locales/zh_cn/analysis";
import { analysis as zhTwAnalysis } from "@/i18n/locales/zh_tw/analysis";
import { ANALYSIS_CATEGORY } from "@/constants/analysis";

/**
 * Info: (20260826 - Julian) 五語系的**插值變數**必須一致（review T5）。
 *
 * ## 既有的守門為什麼不夠
 *
 * `notification_bell_wiring.test.ts` 逐鍵驗 `new RegExp("\\b" + key + ":")`，
 * 而它的註解自稱擋得住「把 ko 的 `{{completed}}` 打錯」—— 實際上擋不住：
 * 那條規則只看**鍵名**，值裡面寫什麼它完全不看。
 *
 * 打錯的後果是那個語系的摘要少一個數字（`{{complete}}` 不會被取代，
 * 使用者看到的是字面的 `{{complete}}`），而沒有任何東西會紅。
 *
 * ## 為什麼用 import 而不是讀原始碼
 *
 * 讀原始碼要自己剖析 TS 物件字面量，而 prettier 會把長字串折行 ——
 * 正規表示式遲早剖錯，然後這支測試會用「剖不到就當成沒有」的方式安靜放行。
 * 直接 import 拿到的是**執行期真正的值**，與 `t()` 讀到的是同一份。
 */

const LOCALES = { en, ja, ko, zh_cn: zhCn, zh_tw: zhTw };

/** Info: (20260826 - Julian) 取出一段文案裡所有 `{{name}}` 的名字 */
function placeholdersOf(text: string): string[] {
  return [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort();
}

// Info: (20260826 - Julian) 以 zh_tw 為基準：它是產品文案的來源語言
const REFERENCE = zhTw;
const REFERENCE_KEYS = Object.keys(REFERENCE) as (keyof typeof REFERENCE)[];

/**
 * Info: (20260828 - Julian) 「可以繼續了」那兩句**不得宣稱翻面的原因**。
 *
 * 兩個被禁的詞各有來歷：
 *
 * - **點數**：原本寫「點數已補回」，而那是一件沒有發生的事 —— 翻面的判準只看
 *   訂閱方案的視窗額度（`canResumeNow` 的 `chainCredits` 是字面量 0，因為第二層
 *   扣款停用中），加購的點數改變不了判準裡的任何一個數。實測時我們照著那句話
 *   去加購，白等了一輪（見 `resumable_job_resume_notification.md` §6.2）。
 * - **額度**：改成「額度已恢復」之後仍然只對一半 —— 個人付款那條路恢復的
 *   不是額度，是那筆款項付掉了（review #6732 的 1-A）。
 *
 * 兩條路共用一句，是因為翻面時 `pauseReason` 已被清成 null。要分辨原因得先做
 * `resumedBy`（計劃 §5）；在那之前，文案只說**做得到的下一步**。
 * 哪天真的做了並拆成兩句，這一條會紅 —— 那時它要求的是回來重新決定，
 * 而不是預設沿用。
 *
 * 只掃中文兩個語系：那是產品文案的來源語言，其他三個是從它翻的。
 */
describe("可繼續通知不宣稱原因", () => {
  it.each([
    ["zh_tw", zhTw, ["點數", "額度"]],
    ["zh_cn", zhCn, ["点数", "额度"]],
  ])(
    "%s 的 job_resumable 兩句都不提原因",
    (unusedLocale, dictionary, forbidden) => {
      const sentences = [
        dictionary.job_resumable,
        dictionary.job_resumable_fresh,
      ];

      sentences.forEach((sentence) => {
        forbidden.forEach((word) => {
          expect({ sentence, word, contains: sentence.includes(word) }).toEqual(
            {
              sentence,
              word,
              contains: false,
            },
          );
        });
      });
    },
  );
});

describe("通知文案的五語系一致性", () => {
  /**
   * Info: (20260826 - Julian) 前提：基準語系真的有帶插值的鍵。
   *
   * 少了這一條，「所有文案都沒有插值」也會讓底下每一條空過 —— 而那正是
   * 這支測試想抓的錯誤（插值被整個拿掉）。
   */
  it("基準語系裡確實有帶插值的文案", () => {
    const withPlaceholders = REFERENCE_KEYS.filter(
      (key) => placeholdersOf(REFERENCE[key]).length > 0,
    );

    expect(withPlaceholders.length).toBeGreaterThan(2);
  });

  /**
   * Info: (20260902 - Julian) `todos_capped` **不得帶任何插值**（review #6742）。
   *
   * 待辦節有三個來源（邀請不截斷、可接續最多 `JOB_RESUMABLE_NOTICE_LIMIT`
   * 筆、入庫待辦最多 `NOTIFICATION_TODO_LIST_LIMIT` 筆），而旗標只反映中間
   * 那一支 —— 任何數字都會與畫面實際列出的則數、以及徽章的總數分岔。
   * 初版寫死成 5：2 封邀請 + 8 份可接續時，畫面 7 則、文案 5、徽章 10。
   *
   * 上面那條「鍵集合與基準一致」擋不住這件事：五個語系一起把 `{{count}}`
   * 加回去時，兩邊的插值集合仍然相同 —— 逐鍵比對只看得見**分岔**，
   * 看不見**一致地錯**。所以這一條直接對著那個鍵斷言。
   *
   * 元件那一側的對應斷言在 `notification_bell_wiring.test.ts`
   *（不得出現 `JOB_RESUMABLE_NOTICE_LIMIT`）。兩側都要有：只擋文案的話
   * 元件仍可以自己拼一個數字進去，只擋元件的話文案可以自己寫死一個。
   */
  it.each(Object.keys(LOCALES))("%s 的 todos_capped 不帶插值", (locale) => {
    const dictionary = LOCALES[locale as keyof typeof LOCALES];

    expect(placeholdersOf(dictionary.todos_capped)).toEqual([]);
  });

  it.each(Object.keys(LOCALES))("%s 的鍵集合與基準完全一致", (locale) => {
    const dictionary = LOCALES[locale as keyof typeof LOCALES];

    // Info: (20260826 - Julian) 兩個方向都要比：少一個鍵會露出原始 key，多一個是死文案
    expect(Object.keys(dictionary).sort()).toEqual([...REFERENCE_KEYS].sort());
  });

  /**
   * Info: (20260826 - Julian) 逐鍵比對插值集合 —— T5 的正題。
   *
   * 比對的是**集合**而不是數量：`{{todos}}` 打成 `{{todo}}` 時數量一樣，
   * 而那正是最容易發生的打錯方式。
   */
  it.each(Object.keys(LOCALES))("%s 的每一句插值變數都與基準相同", (locale) => {
    const dictionary = LOCALES[locale as keyof typeof LOCALES];
    const mismatches: string[] = [];

    REFERENCE_KEYS.forEach((key) => {
      const expected = placeholdersOf(REFERENCE[key]);
      const actual = placeholdersOf(
        (dictionary as Record<string, string>)[key] ?? "",
      );
      if (expected.join(",") !== actual.join(",")) {
        mismatches.push(
          `${String(key)}: 基準 [${expected.join(", ")}]，${locale} [${actual.join(", ")}]`,
        );
      }
    });

    expect(mismatches).toEqual([]);
  });

  /**
   * Info: (20260826 - Julian) 沒有空字串（漏翻的形狀）。
   *
   * 空字串在畫面上是一片空白，而 `t()` 找得到鍵、不會退回 defaultValue ——
   * 所以它比缺鍵更難發現。
   */
  it.each(Object.keys(LOCALES))("%s 沒有空字串文案", (locale) => {
    const dictionary = LOCALES[locale as keyof typeof LOCALES] as Record<
      string,
      string
    >;
    const empty = Object.keys(dictionary).filter(
      (key) => dictionary[key].trim() === "",
    );

    expect(empty).toEqual([]);
  });
});

/**
 * Info: (20260828 - Julian) 每一種 `ANALYSIS_CATEGORY` 都要在五語系查得到名字。
 *
 * ## 為什麼這條屬於這裡
 *
 * 通知的報告名稱走 `analysisTitleOf`，而它**複用分析頁的字典**
 *（`analysis.categories.<category 小寫>`），不另外存一份標題進 payload。
 * 所以「字典少一個類別」的後果落在通知上，而字典完整性的擁有者是這個檔案 ——
 * `notification_message.test.ts` 的假 `t` 刻意不回真的翻譯，那裡驗不到這件事。
 *
 * ## 這條擋的是什麼
 *
 * `JOURNAL_CORRECTION` 的鍵曾經是 `journal_upload` —— 一個沒有任何消費者的死鍵。
 * 於是日記帳修正完成時，通知退回不帶標題的通用句「你的分析已完成」，
 * 使用者收到一則說不出自己是什麼的通知，而沒有任何測試會紅
 *（`analysisTitleOf` 有 `defaultValue`，查不到就安靜地回空字串）。
 *
 * 表格驅動而不是逐個列舉：缺口的成因就是「新增類別卻忘了補字典」，
 * 而逐個列舉的清單同樣會被忘記。
 */
describe("分析類別的名稱（通知的報告名稱來源）", () => {
  const CATEGORY_DICTS = {
    en: enAnalysis.categories,
    ja: jaAnalysis.categories,
    ko: koAnalysis.categories,
    zh_cn: zhCnAnalysis.categories,
    zh_tw: zhTwAnalysis.categories,
  } as Record<string, Record<string, string>>;

  it.each(Object.values(ANALYSIS_CATEGORY))(
    "%s 在五語系都有名字",
    (category) => {
      const key = category.toLowerCase();

      Object.entries(CATEGORY_DICTS).forEach(([locale, dictionary]) => {
        const name = dictionary[key];

        expect(`${locale}:${key}=${typeof name}`).toBe(
          `${locale}:${key}=string`,
        );
        expect(name).not.toBe("");
      });
    },
  );
});
