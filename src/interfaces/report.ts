/**
 * Info: (20260728 - Julian) 報表 API 未核對項目（供 UI 提示異常）。
 */
export interface IReportUnverifiedItem {
  id: string;
  note: string;
  type: string;
}

/**
 * Info: (20260728 - Julian) 報表 API 結果（ReportService.getReport 回傳；與 route 回應結構一致）。
 * report 為各報表產生器輸出（資產負債表／損益表／現金流量／試算表／碳盤查），型別各異故以 object 表示，僅供序列化輸出。
 */
export interface IReportResult {
  report: object;
  unverifiedCount: number;
  unverifiedItems: IReportUnverifiedItem[];
}
