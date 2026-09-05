/**
 * Info: (20260904 - Julian) 薪資單信件的主旨與本文（純函式）。
 *
 * ## 本文裡沒有任何金額
 *
 * 計畫書 D1：信件本文只寫「您的 X 月薪資單在附件裡」，數字全部在 PDF 附件。
 * 理由是本文會出現在信箱的預覽列、通知列與鎖定畫面上 ——
 * 把實發金額寫進本文，等於讓它出現在員工手機的通知欄，
 * 而那是他自己控制不了的一塊螢幕。
 *
 * ## 文案為什麼寫死中文
 *
 * 與 `pay_slip_html.ts` 同一個理由：專案沒有伺服器端的 i18n helper，
 * 而我們**不知道收件員工的語言** —— `SalaryCalculatorEmployee` 沒有語言欄位，
 * 他也不是本站使用者。硬挑一個語系不如挑一個明確的：與計算機畫面同樣的繁中。
 */

export interface IPaySlipMailInput {
  employeeName: string;
  year: number;
  month: number;
}

export interface IPaySlipMailContent {
  subject: string;
  text: string;
  html: string;
}

/**
 * Info: (20260904 - Julian) 員工姓名是使用者輸入，而它會進到信件的 HTML 本文。
 * 與 `pay_slip_html.ts` 的 `escapeHtml` 相同，理由也相同。
 */
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Info: (20260904 - Julian) 主旨不含姓名。
 *
 * 主旨在收件匣列表上是明文可見的，包含在別人看得到的畫面分享、
 * 投影與肩後視線裡。期間足以讓收件者分辨這是哪一封，
 * 而收件者本來就知道自己是誰。
 */
export const buildPaySlipMail = (
  input: IPaySlipMailInput,
): IPaySlipMailContent => {
  const period = `${input.year} 年 ${input.month} 月`;
  const name = input.employeeName;

  const subject = `${period}薪資單`;

  const text = [
    `${name} 您好：`,
    "",
    /**
     * Info: (20260904 - Julian) `${period}` 之後不留空格。
     *
     * 期間字串以「月」結尾，接著是「的」—— 兩個都是全形中文字，中間加空白
     * 會在畫面上開一個洞。前面那個空格要留：它隔開的是「您」與阿拉伯數字，
     * 中英數之間留白是慣例（盤古之白）。
     */
    `隨信附上您 ${period}的薪資單，內容為 PDF 附件。`,
    "",
    "若附件無法開啟，或內容與您的認知有出入，請與貴公司的人資或會計聯繫。",
    "本信件由系統自動寄出，請勿直接回覆。",
    "",
    "iSunFA",
  ].join("\n");

  /**
   * Info: (20260904 - Julian) HTML 本文刻意極簡：沒有外部圖片、沒有追蹤像素、
   * 沒有連結。一封帶著薪資單的信不該再多一個對外連線 ——
   * 而純文字備援（`text`）在不少過濾器眼中是「這不是釣魚信」的證據之一。
   */
  const html = [
    `<p>${escapeHtml(name)} 您好：</p>`,
    `<p>隨信附上您 <strong>${period}</strong>的薪資單，內容為 PDF 附件。</p>`,
    "<p>若附件無法開啟，或內容與您的認知有出入，請與貴公司的人資或會計聯繫。</p>",
    '<p style="color:#6b7280;font-size:12px">本信件由系統自動寄出，請勿直接回覆。<br />iSunFA</p>',
  ].join("\n");

  return { subject, text, html };
};
