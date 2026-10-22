export type ILanceDBRow = {
  id: string;
  vector: Float32Array<ArrayBuffer>;
  text: string;
  reportId: string;
  companyName: string;
  pageNumber?: number;
  // Info: (20261022 - Luphia) 官方來源網址；只有企業觀測站的切塊有，手動匯入的報告沒有
  sourceUrl?: string;
  _distance?: number;
};
