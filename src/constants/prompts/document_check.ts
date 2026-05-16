export const getDocumentDuplicateCheckPrompt = () => {
  return `
請快速檢查用戶上傳的憑證（檔案/圖片），判斷並萃取能代表此憑證唯一性的特徵。
不要對帳務做其他分析，只要特徵。即使圖片模糊，也盡力提取。
`;
};
