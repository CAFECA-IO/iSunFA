import * as lancedb from "@lancedb/lancedb";
import path from "path";

const dbUri = process.env.LANCEDB_URI || "./.lancedb_data";
const TABLE_NAME = "company_reports";

class LanceDBService {
  private dbInstance: lancedb.Connection | null = null;

  // Info: (20260612 - Julian) 全域唯一連線
  private async connect(): Promise<lancedb.Connection> {
    if (this.dbInstance) return this.dbInstance;
    this.dbInstance = await lancedb.connect(path.resolve(dbUri));
    return this.dbInstance;
  }

  async getTable(): Promise<lancedb.Table> {
    try {
      const db = await this.connect();
      // Info: (20260612 - Julian) ⚠️不要快取 tableInstance，否則 Next.js 會永遠讀取到舊版 (MVCC 快照) 的資料庫狀態
      return await db.openTable(TABLE_NAME);
    } catch (error) {
      console.error(`[LanceDB Service] 無法開啟資料表 ${TABLE_NAME}:`, error);
      throw new Error("資料庫尚未初始化，請先執行 npm run db:init");
    }
  }
}

export const lanceDBService = new LanceDBService();
