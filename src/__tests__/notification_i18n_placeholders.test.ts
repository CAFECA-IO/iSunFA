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
