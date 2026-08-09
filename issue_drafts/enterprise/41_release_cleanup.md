# [P3] Release 清理:ToDo 清空、i18n、觀測性統一(上市前最後一張)

## 問題

Release 鐵律(annotation.md):`ToDo:` 全清空、`Deprecated:` 全移除。outline 章節/段落 title 與報告表頭硬編中文;前端與 lib 有裸 `console.*`(後端已用 logger,前端/laria 未統一);documents 缺 observability 規範。

### 盤點數字(2026-08-06 實測,全部排除 `src/generated/`)

原本寫的「4 處 ToDo / 28+ 處裸 console」是本 issue 開票當時的數字,已嚴重低估,
照舊數字排程會把這張票當成半天的工作。實測:

| 指標 | 開票時寫 | 2026-08-06 實測 | 指令 |
| :-- | --: | --: | :-- |
| `// ToDo:` | 4 | **34** | `grep -rn '// ToDo:' src --exclude-dir=generated \| wc -l` |
| `Deprecated:` | (未列) | 1 | `grep -rn 'Deprecated:' src --exclude-dir=generated \| wc -l` |
| 裸 `console.*` | 28+ | **1361** | `grep -rn 'console\.' src --exclude-dir=generated \| wc -l` |
| └ 其中 `use_carbon_chat.ts` | 11 | **40** | |
| `eslint-disable` | (未列) | 28 | `grep -rn 'eslint-disable' src --exclude-dir=generated \| wc -l` |

**34 處 ToDo 遍及 salary_calculator、repositories、skills 等與 carbon 無關的模組** ——
驗收條件「`grep ToDo: src/` 零結果」意味著要動整個 repo,不只本功能區。
1361 處 console 更不可能逐一手改,務實的做法是先擋新增(ESLint `no-console` 對新檔/改檔生效),
既有的分批遷移,而不是把它列成一張票的驗收條件。

## 實作辦法

1. **ToDo 清算**(部分由前置 issue 消化,此處驗收):
   - `laria.ts:4` RS 庫 → issue 13 清除
   - `carbon_report_outline.ts:18,33` + `carbon_report_preview.tsx:58` 中文硬編 → 本 issue:outline title 改 i18n key(`carbon_outline.{id}.title`),5 語系補齊;報告 markdown 產出時以當前語言解析(下載的 PDF 跟隨使用者語言)
2. **前端觀測性**:`src/lib/utils/client_logger.ts` — 統一包裝(dev 透傳 console,prod 靜默或上報埋點);`use_carbon_chat.ts` 11 處、`carbon_report_draft_storage.ts` 3 處、`laria.ts`/`storage.service.ts` 全數替換。ESLint 加 `no-console` 於 src/(允許 client_logger 內部)。
3. **魔法值總清點**:issue 10 已收 LLM 參數;此處掃尾 — `storage.service.ts:161` recover 路徑模板、`schema.prisma` algorithm 字串來源常數化(schema default 保留,TS 端引常數比對)。
4. **documents 補件**:`documents/engineering_guidelines/observability_guideline.md`(logger 分層:後端 logger/前端 client_logger、事件命名、禁止 console 直呼)— 盤點確認此規範目前空白。
5. **最終檢查腳本**:`scripts/release_check.sh` — grep `ToDo:`/`Deprecated:` 非零即 fail、eslint 零警告、`npm test`;掛進 release 流程。

## 進度(2026-08-06 對照程式碼)

| 項 | 狀態 | 證據 |
| :-- | :-- | :-- |
| 1 `laria.ts` 的 ToDo | 已清 | `src/lib/laria.ts` 已無 `ToDo:` |
| 1 outline / preview 中文硬編改 i18n | 未動 | `src/constants/carbon_report_outline.ts:18,33` ToDo 仍在,`CARBON_REPORT_CHAPTERS` 仍硬編中文;`src/components/carbon_chatbot/carbon_report_preview.tsx:69` ToDo 仍在(原記 `:58`,行號已漂移) |
| 2 `client_logger.ts` | 未建立 | `grep -rln 'client_logger\|clientLogger' src/` 零命中 |
| 2 ESLint `no-console` | 未依本 issue 設定 | `eslint.config.mjs:107` 僅 `production ? 'warn' : 'off'`,非「擋在 src/、允許 client_logger」 |
| 3 `storage.service.ts` 路徑常數化 | 未動 | `src/services/storage.service.ts:157-160` 仍內聯 `"isunfa-download"` / `"shards"` / `"recovered_file"` |
| 4 `observability_guideline.md` | 未建立 | 該目錄僅 coding / numerical_precision / rate_limiting 三份 + work_guidelines/ + known_issues/ |
| 5 `scripts/release_check.sh` | 未建立 | `scripts/` 下只有 `ssh_key.sh` 一支 shell |

## 依賴

所有其他 enterprise issue 之後(必須最後執行,否則 ToDo 清不乾淨)。

## 驗收

- `grep -rn "ToDo:\|Deprecated:" src/ --exclude-dir=generated` 零結果
  (**現況 35 處,且多數在本功能區之外** —— 這條驗收的範圍是整個 repo,排程時要當成 repo 級工作)
- 切 EN 介面下載報告 → 章節標題/表頭全英文;5 語系 key 完整
- `src/` 新增與修改處無裸 console(ESLint 擋);既有 1361 處分批遷移,不列為本票的完成條件
- release_check.sh 全綠
