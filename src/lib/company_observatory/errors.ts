import { ObservatorySource } from "@/constants/company_observatory";

/**
 * Info: (20261015 - Luphia) 企業觀測站的兩種「不是這份文件的錯」。
 *
 * 遇到它們時本輪停手、**不累計失敗次數**：來源網站叫我們慢一點、或本機的向量服務沒開，
 * 都不代表這份報告有問題。若照一般失敗計次，Ollama 關掉一個下午就會把整批文件送進死信。
 */

// Info: (20261015 - Luphia) 來源網站回應「查詢過繁」等限流訊號：本輪不再碰這個來源
export class ObservatorySourceThrottledError extends Error {
  public readonly source: ObservatorySource;

  constructor(source: ObservatorySource, message: string) {
    super(message);
    this.name = "ObservatorySourceThrottledError";
    this.source = source;
  }
}

// Info: (20261015 - Luphia) 嵌入服務或 LanceDB 資料表不可用：本輪不索引
export class ObservatoryInfraUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ObservatoryInfraUnavailableError";
  }
}
