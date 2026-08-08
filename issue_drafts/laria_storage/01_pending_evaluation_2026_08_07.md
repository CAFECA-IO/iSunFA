# 待評估處理事項:Laria 儲存層與周邊(2026-08-07 盤點)

**Labels**: tech-debt, laria, storage, needs-triage
**來源**: 2026-08-07 架構文件與 `src/lib/laria.ts` / `reed_solomon_erasure.ts` /
`storage.service.ts` / `skills/utils/document_helper.ts` 通讀
**前置**: ADR 012(真 Reed-Solomon)已 Accepted 並落地,以下是**該 ADR 之後仍留在周邊的洞**

> 本文件只做記錄與排序,**尚未排入任何 sprint**。逐項確認後再拆成正式 issue。

---

## 1. `document_helper` 吞掉 Laria 還原失敗,並以誤導性訊息取代(P1)

`src/skills/utils/document_helper.ts:77`

```ts
} catch (e) {
  console.warn(`[DocumentHelper] Failed to recover file from Laria ...`, e);
}
// ...接著因為 images.length === 0 而拋出:
throw new Error("No fileBase64, fileMimeType, or journalText provided ... outdated task format.");
```

真正的失敗是「Laria 還原失敗」(可能是切片不足、sha256 不符、Storage 不可達),
但拋給上層的訊息是「任務格式過舊」。排查時會把人指向**完全錯誤的方向**,
而且 ADR 012 特地把「靜默回傳損毀資料」改成「明確報錯」的價值,
在這一層又被吞回去了。

同檔全數使用 `console.log` / `console.warn`,與 `laria.ts` 的 `lariaLogger`
(`logger.child({ service: "laria" })`)不一致,集中式 log 撈不到這段。

**方向**:還原失敗直接向上拋(附原始錯誤),`fileId` 存在卻還原不出來時
不得降級為「格式過舊」;改用 logger。

## 2. `storage.service.recoverLaria` 對外部 JSON 零驗證(P1,規範違反)

`src/services/storage.service.ts:173`

```ts
const metadata = await metadataRes.json();      // 隱性 any
const metaObj = metadata.payload || metadata;
const { shards, originalFileSize } = metaObj;   // 只檢查兩個欄位
```

`shards` 是外部 Storage 回傳的陣列,未驗證元素型別、長度是否等於 `TOTAL_SHARDS`。
`shards.map((shardHash: string, i) => ... shard-${i+1}.bin)` 直接用**陣列索引**
決定切片編號 —— 若上游回傳的陣列長度或順序有變,會把切片對應到錯誤的位置,
而 RS 重建出來的是**看起來成功、內容錯誤**的檔案(v2 有 sha256 會攔下,
舊檔沒有 sha256 則不會)。

依 CLAUDE.md 第 2 條(零容忍 `any`、外部資料先驗證)與第 1 條(Validator 集中化),
這裡應在 `src/validators/` 定義 `LariaMetadataSchema` 並 `safeParse`。
同檔亦全數使用 `console.*`。

## 3. `uploadLaria` 8 個切片序列上傳,且失敗無重試無清理(P2)

`src/services/storage.service.ts:102` 的 `for (let i = 1; i <= shardCount; i++)`
逐片 `await this.uploadFile(...)`。ADR 012 自己的結論是
「瓶頸在網路上傳,不在編碼」,但上傳這一段沒有並行。
另外任一片失敗即 throw,已上傳的片不會清理(留下孤兒),也沒有重試 ——
`rate_limiting_guideline.md` 把 `UPLOAD` bucket 定義為「Laria 分片與儲存成本」,
表示這條路徑本來就預期會遇到限流。

**方向**:`Promise.allSettled` 並行 + 有界重試;失敗時明確回報哪幾片失敗。

## 4. 前端切片實作是否已對齊 v2(P1,未追蹤)

ADR 012「後果」段明列:

> 前端若有對應切片實作(「與前端同步」註解),需另行對齊 v2 編碼 —— 追蹤於後續 issue

`laria.ts:63` 的 `// Info: (20260415 - Gemini) 與前端同步:動態計算 Shard 大小` 仍在,
但 repo 內找不到這張後續 issue。**若前端仍在產 v1 編碼,新上傳的檔案會持續是零冗餘**,
而 v2 的還原路徑會把它們判為 legacy —— 缺任一資料切片即失敗。
這等於 ADR 012 只修好了讀取端。

**方向**:先確認前端是否存在獨立切片實作;有則開票對齊,無則把 ADR 的那句話與
`laria.ts` 的註解一併更新,避免留下假的待辦。

---

## 排序建議

| # | 項目 | 嚴重度 | 判斷 |
|---|---|---|---|
| 4 | 前端 v2 對齊 | P1 | 影響**新資料**的冗餘是否為真,先確認事實成本最低 |
| 1 | 還原失敗被吞 | P1 | 純除錯體驗,但會讓 4 的問題更難被發現 |
| 2 | metadata 無驗證 | P1 | 舊檔路徑無 sha256 保護時是靜默錯誤 |
| 3 | 序列上傳 | P2 | 效能與限流韌性,不影響正確性 |
