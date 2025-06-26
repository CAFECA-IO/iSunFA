export interface IExternalUser {
  id?: number;
  sessionId: string; // Info: (20241015 - Anna) 用於綁定外部用戶與內部用戶的會話 ID，若未綁定則為 undefined
  userId?: number; // Info: (20241015 - Anna) 綁定的內部用戶 ID，若未綁定則為 undefined
  externalId: string; // Info: (20241015 - Anna) 外部用戶的唯一識別碼
  externalProvider: string; // Info: (20241015 - Anna) 外部提供者，例如 Google、Facebook 等
  createdAt?: number; // Info: (20241015 - Anna) 創建時間戳記
  updatedAt?: number; // Info: (20241015 - Anna) 更新時間戳記
  expiredAt?: number; // Info: (20241015 - Anna) 外部用戶資料的有效期，通常為 5 分鐘
}
