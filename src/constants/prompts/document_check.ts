export const getDocumentDuplicateCheckPrompt = () => {
  return `
請快速檢查用戶上傳的憑證（檔案/圖片），判斷並萃取能代表此憑證唯一性的特徵。
不要對帳務做其他分析，只要特徵。即使圖片模糊，也盡力提取。

請務必回傳一個 JSON 格式，包含以下欄位（不要加入任何額外的文字，也不要包裝在 markdown 程式碼區塊中，直接回傳 JSON 字串）：
{
  "invoiceNumber": "string", // 發票/收據字軌號碼，完全找不到則回傳 null
  "vendorTaxId": "string",   // 賣方統編，完全沒寫則回傳 null
  "tradingDate": "YYYY-MM-DD", // 交易日期，完全找不到則回傳 null
  "totalAmount": 1500        // 總金額 (數字)，完全找不到則回傳 null
}
`;
};
