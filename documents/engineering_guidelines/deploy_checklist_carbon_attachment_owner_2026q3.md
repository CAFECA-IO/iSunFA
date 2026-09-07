# 部署檢查表：碳盤查附件 cid 歸屬（#6748）

- 版本：v1.0（2026-09-07，Emily）
- 適用：`fix/carbon_qa_facts_0907` 帶進的 schema 變更（新增一張表，無回填）
- 依據：`code_review_checklist.md` §5.3「改 schema 的 PR 一律在部署檢查表寫下：新增了哪些欄位、需要哪支回填、以及做錯順序的症狀」

> **本專案沒有 `migrations` 目錄。** schema 以 `prisma db push` 套用。
> 這次只**新增**一張表、沒有改既有欄位、沒有回填 —— 所以 `db push` 對既有資料列是安全的。
> 但**部署後行為會變**：見第三節，那不是 bug，是這道門存在的理由。

---

## 一、這次動了什麼

### 新增 1 張表

| 表 | 用途 | 特別注意 |
|---|---|---|
| `carbon_attachment_owner` | 每個附件 cid 的上傳者（`cid` 主鍵、`address` 索引） | `address` 以 `canonicalizeAddressForKey` 正規化（小寫）存入；同 cid 重複上傳**不改**擁有者 |

### 寫入點（一處）

`AttachmentSecurityService.processUpload`：`uploadLaria` 成功 → **記擁有者** → 記用量。
歸屬先於用量：歸屬是讀取端的授權依據，少了它上傳者自己也讀不回來；用量只是配額計數。

### 讀取端裁決（兩處）

| 端點 | 裁決點 | 拒絕時 |
|---|---|---|
| `POST /api/v1/chat/carbon/import` | 讀到 `cid` 之後、`recoverLaria` 之前 | `AU000005`，不讀檔、不透露 cid 存不存在 |
| `POST /api/v1/chat/carbon`（附件） | 頻道所有權裁決之後、**訊息入庫之前** | `AU000005`，整則拒絕（不做部分過濾） |

裁決函式：`canReadAttachmentCid(address, cid)` —— 擁有者必須是呼叫者本人；**查無擁有者一律拒絕**。

---

## 二、部署步驟

```
npx prisma generate
npx prisma db push
```

兩者順序無所謂（新表、無回填），但**都要在切流量之前**。`db push` 之前部署新程式碼會怎樣：上傳端 `recordOwner` 對不存在的表拋錯 → **上傳失敗**（不是靜默）；讀取端查不到表也拋錯。所以先 `db push` 再切流量。

---

## 三、部署後會變的行為（要先告知）

**上線前上傳的附件 cid 沒有歸屬紀錄 → 一律讀不回來。**

影響的是「上線前已上傳、上線後才按匯入 / 重試」的待匯入紀錄：`/import` 回 `AU000005`。
前端本來就有「cid 取不回就退回直傳」那條路（`import/route.ts` 的 `file` 分支），使用者重選一次檔即可。

為什麼不做「查無即放行」：那會讓所有舊 cid 永遠在門外，這道門對它們等於不存在；
而「舊 cid」對攻擊者來說只是一個不會過期的清單。

為什麼不回填：Laria 的 metadata hash 由內容決定，沒有任何紀錄能事後證明哪個 cid 是誰的；
用量表只記位元組數。回填等於猜。

---

## 四、做錯順序的症狀

| 症狀 | 原因 |
|---|---|
| 上傳一律失敗，log 有 `carbon_attachment_owner` 不存在 | 程式碼先上、`db push` 沒跑 |
| 匯入舊檔回 `AU000005` | 正常（第三節），重選檔案即可 |
| 自己剛上傳的檔也 `AU000005` | `recordOwner` 沒寫進去 —— 看上傳端 log；或呼叫者 address 與上傳時不同（不同錢包） |
