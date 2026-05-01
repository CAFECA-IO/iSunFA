# 🚀 iSunFA 企業級部署標準作業流程 (SOP)

為了確保交付給台積電、中國砂輪等企業級客戶的系統穩定性，本專案的部署流程分為 **本地開發環境 (Local Development)** 與 **遠端正式環境 (Production CI/CD)** 兩種標準流程。

---

## 1. 💻 本地開發環境 (Local Development)

當有新進開發者加入，或是您在本地端重置環境時，請依序執行以下指令：

### Phase 1: 基礎環境準備
確保您的環境有 Node.js (>= 18) 與 Docker。

```bash
# 1. 安裝專案所有依賴套件
npm install

# 2. 啟動本地資料庫 (已預設載入 PostGIS 空間擴充引擎)
docker compose up -d postgres

# 3. 根據 schema.prisma 產生對應的 TypeScript 型別
npx prisma generate
```

### Phase 2: 資料庫同步與資料灌入
在本地端測試時，我們允許使用 `db push` 快速同步架構。

```bash
# 4. 將 Prisma 架構推送到本地資料庫 (自動建立表格與 geom 欄位)
npx prisma db push

# 5. 執行全量 Seed 腳本 (自動匯入碳排係數、全球 85,000+ 機場與海港)
npm run seed
# 或使用 Prisma 標準指令：npx prisma db seed
```

### Phase 3: 啟動開發伺服器
```bash
# 6. 啟動 Next.js 開發環境
npm run dev
```

---

## 2. ☁️ 遠端正式環境 (Production CI/CD)

遠端環境 (Production / Staging) **嚴禁使用 `npx prisma db push`**。所有資料庫變更必須透過版本控制的 Migration 來確保資料不遺失。

### Phase 1: CI/CD Pipeline 基礎建置
在伺服器端或是 CI/CD (如 GitHub Actions, GitLab CI) 執行：

```bash
# 1. 確保遠端資料庫 (AWS RDS, GCP Cloud SQL 等) 已開啟 PostGIS 擴充功能
# (由 DBA 或透過基礎設施即程式碼 Terraform 設定)

# 2. 安裝正式環境依賴 (略過 devDependencies 加速)
npm ci --production

# 3. 產生 Prisma Client
npx prisma generate
```

### Phase 2: 安全的資料庫遷移與資料初始化
```bash
# 4. 安全遷移：嚴格依照 Prisma migrations 資料夾內的 SQL 歷史紀錄進行結構變更
npx prisma migrate deploy

# 5. 正式環境基礎資料灌入 (確保冪等性，重複執行不會出錯)
npx prisma db seed
```

### Phase 3: 專案打包與啟動
```bash
# 6. 打包 Next.js 專案
npm run build

# 7. 啟動正式伺服器 (或透過 PM2 / Docker 啟動)
npm run start
```

---

## 💡 最佳實踐與防呆機制 (Best Practices)

1. **冪等性 (Idempotency)**：
   我們寫的 Seed 腳本內部採用了 `ON CONFLICT DO UPDATE` 邏輯。這代表即使遠端伺服器在每次 CI/CD 流程中都不小心執行到 `npx prisma db seed`，資料庫也不會發生重複寫入或主鍵衝突的錯誤。
2. **Schema 版本控制**：
   如果您未來在 `schema.prisma` 新增了欄位，請在本地端執行 `npx prisma migrate dev --name <your_feature_name>` 產生 SQL 檔案並 Commit，遠端伺服器只要跑 `migrate deploy` 就會自動跟上，絕不掉資料。
3. **擴充套件檢查**：
   如果 `migrate deploy` 報錯說找不到 `geom`，100% 是遠端資料庫忘記下 `CREATE EXTENSION postgis;`，請 DBA 補上即可。
