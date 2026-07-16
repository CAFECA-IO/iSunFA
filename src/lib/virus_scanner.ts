/**
 * Info: (20260716 - Emily) 病毒掃描介面與 ClamAV 實作(#6517)。
 * 介面先行: 未配置 ClamAV 時為 skipped(no-op)，部署環境接 ClamAV sidecar 即啟用。
 * ⚠️ env 簽章制約(admin_setup_whitepaper.md): 啟用需將 CLAMAV_HOST/CLAMAV_PORT
 * 寫入 .env，而 .env 受 FIDO2 簽章鎖定 — 必須由超級管理員經 /admin/setup
 * 重新簽署封裝，嚴禁手動編輯(會觸發 SIGNATURE_MISMATCH 系統鎖定)。
 */

import net from "net";
import { logger } from "@/lib/utils/logger";

export enum VirusScanStatusEnum {
  CLEAN = "CLEAN",
  INFECTED = "INFECTED",
  // Info: (20260716 - Emily) 未配置掃描器: 依 fail-open 策略放行(拒收會讓掃毒器缺席 = 全站不能上傳)
  SKIPPED = "SKIPPED",
  // Info: (20260716 - Emily) 掃描器故障: fail-open 放行 + 告警(可用性優先，故障需監控告警修復)
  ERROR = "ERROR",
}

export interface IVirusScanResult {
  status: VirusScanStatusEnum;
  signature?: string;
}

export interface IVirusScanner {
  scan(buffer: Buffer): Promise<IVirusScanResult>;
}

const CLAMAV_DEFAULT_PORT = 3310;
const CLAMAV_TIMEOUT_MS = 30_000;
const CLAMAV_CHUNK_SIZE = 64 * 1024;

/**
 * Info: (20260716 - Emily) ClamAV INSTREAM 協定:
 * 送 "zINSTREAM\0" → 連續 [4-byte BE 長度][chunk] → 0 長度結束 → 回應 "stream: OK" 或 "stream: <sig> FOUND"
 */
export class ClamAvScanner implements IVirusScanner {
  private readonly host: string;

  private readonly port: number;

  constructor(host: string, port: number = CLAMAV_DEFAULT_PORT) {
    this.host = host;
    this.port = port;
  }

  async scan(buffer: Buffer): Promise<IVirusScanResult> {
    try {
      const response = await this.instream(buffer);
      if (response.includes("OK") && !response.includes("FOUND")) {
        return { status: VirusScanStatusEnum.CLEAN };
      }
      const match = response.match(/stream: (.+) FOUND/);
      if (match) {
        return {
          status: VirusScanStatusEnum.INFECTED,
          signature: match[1],
        };
      }
      logger.error("clamav unexpected response", { response });
      return { status: VirusScanStatusEnum.ERROR };
    } catch (error) {
      logger.error("clamav scan failed (fail-open)", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { status: VirusScanStatusEnum.ERROR };
    }
  }

  private instream(buffer: Buffer): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const socket = net.createConnection({
        host: this.host,
        port: this.port,
        timeout: CLAMAV_TIMEOUT_MS,
      });
      let response = "";

      socket.on("connect", () => {
        socket.write("zINSTREAM\0");
        for (
          let offset = 0;
          offset < buffer.length;
          offset += CLAMAV_CHUNK_SIZE
        ) {
          const chunk = buffer.subarray(offset, offset + CLAMAV_CHUNK_SIZE);
          const sizeHeader = Buffer.alloc(4);
          sizeHeader.writeUInt32BE(chunk.length, 0);
          socket.write(sizeHeader);
          socket.write(chunk);
        }
        socket.write(Buffer.alloc(4)); // Info: (20260716 - Emily) 0 長度 = 串流結束
      });
      socket.on("data", (data) => {
        response += data.toString();
      });
      socket.on("end", () => resolve(response));
      socket.on("timeout", () => {
        socket.destroy();
        reject(new Error("clamav timeout"));
      });
      socket.on("error", (error) => reject(error));
    });
  }
}

// Info: (20260716 - Emily) 未配置時的 no-op: 首次呼叫記一次 warn，避免掃毒缺席無人知曉
export class NoopVirusScanner implements IVirusScanner {
  private warned = false;

  async scan(): Promise<IVirusScanResult> {
    if (!this.warned) {
      this.warned = true;
      logger.warn(
        "virus scanner not configured (CLAMAV_HOST unset); uploads are NOT scanned",
      );
    }
    return { status: VirusScanStatusEnum.SKIPPED };
  }
}

// Info: (20260716 - Emily) 工廠: CLAMAV_HOST 已簽入 env 時啟用 ClamAV，否則 no-op
export const createVirusScanner = (): IVirusScanner => {
  const host = process.env.CLAMAV_HOST;
  if (!host) return new NoopVirusScanner();
  const port = Number.parseInt(process.env.CLAMAV_PORT ?? "", 10);
  return new ClamAvScanner(
    host,
    Number.isFinite(port) && port > 0 ? port : CLAMAV_DEFAULT_PORT,
  );
};
