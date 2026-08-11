# 架構決策紀錄 (ADR) 016: HR PII Data Classification and Field-Level Encryption (人事個資分級與欄位級加密)

> **Date**: 2026-08-11
> **Author**: Julian
> **Status**: ✅ Accepted
> **核心目標**: 為人事模組 13 張表的敏感個資訂出保護等級，並說明為何取「伺服器持鑰的欄位級加密」，而不是碳盤查那套 E2EE、也不是沿用帳本模式的明文。

---

## 🛑 1. 當前架構挑戰 (Context)

人事模組一次新增 13 張表，其中存放的是本系統目前為止最敏感的一類資料：

- `Employee.nationalId`（身分證字號 / 護照號碼）、`birthday`、`address`、`phone`
- `Dependent.nationalId`、`birthday`（眷屬個資）
- `BankAccount.accountNumber`、`accountHolder`（薪轉帳戶）
- `EmergencyContact.phone`、`altPhone`（第三人聯絡資訊）

初版全部是明文 `String`，沒有加密、遮罩或存取稽核。

**問題不在於明文本身，而在於保護強度與資料價值反了過來。**同一個 repo 裡，碳盤查的聊天訊息與報告草稿享有全程 E2EE、ECIES envelope、`keyDerivationHint`，上週才為它補上「寫得進去就必須讀得出來」的儲存層不變式（`carbon_envelope_invariant.ts`）。而碳排活動數據外洩的後果，與身分證字號加銀行帳號外洩的後果，不是同一個量級。

`sovereign_cloud_security_drp.md` 已宣告 PostgreSQL 採 AES-256 靜態加密，但那是**磁碟層**的保護：它防的是實體磁碟被搬走，對 `pg_dump`、對持有連線字串的人、對誤上傳到共用空間的還原檔完全無效 —— 而那些正是個資外洩事故的實際大宗。

13 張表一旦落地，初版的選擇就成為這個模組的預設值，也成為後續薪資、考勤、績效模組抄襲的樣板。

---

## 🎯 2. 決策一：資料分級 (Data Classification)

人事資料分三級，分級決定「要不要加密」與「讀取完整值要不要寫稽核」。

| 級別 | 定義 | 欄位 | 加密 | 預設遮罩 | 讀取稽核 |
|---|---|---|---|---|---|
| **Tier 1 · RESTRICTED** | 單獨即可用於冒用身分或盜用金流 | `Employee.nationalId`、`Dependent.nationalId`、`BankAccount.accountNumber`、`BankAccount.accountHolder` | ✅ | ✅ | ✅ |
| **Tier 2 · CONFIDENTIAL** | 可識別特定自然人，單獨不足以冒用 | `Employee.birthday` / `address` / `phone`、`Dependent.birthday`、`EmergencyContact.phone` / `altPhone` | ✅ | ✅ | ➖ |
| **Tier 3 · INTERNAL** | 業務識別資訊，本就需要在畫面與查詢中直接使用 | `employeeNo`、`email`、`name`、`englishName`、`gender`、`hireDate`、`bankCode` / `bankName` / `branchCode` / `branchName` | ➖ | ➖ | ➖ |

### 逐項說明 Tier 3 為何不加密

不加密是**刻意的決定**，不是漏掉的：

- **`employeeNo` / `email`**：兩者都是 `@@unique([accountBookId, x])` 的成員。AES-GCM 每次用隨機 IV，同一明文兩次加密不同值，唯一約束掛不上密文。
- **`name` / `englishName`**：列表排序與模糊搜尋的主要欄位，加密後兩者都做不到，而姓名單獨不足以冒用身分。
- **`gender` / `hireDate` / `status`**：統計與流程判斷的依據，且不具唯一識別性。
- **`bankCode` / `bankName` / `branchCode` / `branchName`**：公開的金融機構字典值，不是個資。金融風險集中在帳號與戶名，那兩個已在 Tier 1。
- **`Dependent.name` / `relationship`、`EmergencyContact.name` / `relationship`**：需在畫面直接顯示；姓名與關係單獨不足以冒用，且遮罩後這份名單就失去了它存在的目的（緊急時要能立刻認出打給誰）。

---

## 🎯 3. 決策二：加密策略取「伺服器持鑰的欄位級加密」

**決策：敏感欄位以 AES-256-GCM 加密後入庫，金鑰由伺服器持有（環境變數 / KMS），資料庫本身讀不到明文，但應用層與背景 Worker 讀得到。**

### 為什麼不是 E2EE（碳盤查那套）

`ChatroomMessage` / `CarbonReportDraft` 的 ECIES envelope 之所以成立，是因為那些資料**只有使用者自己要讀**，伺服器讀不到不影響任何功能。

人事資料相反 —— 以下全部是背景 Worker 在跑，金鑰若只在前端就永遠解不開：

1. 薪轉檔產製（需要 `accountNumber` / `accountHolder`）
2. 勞健保投保與退保申報（需要 `nationalId`、`birthday`、眷屬資料）
3. 試用期到期、證照到期的排程通知
4. 離職退保生效日的流程推進

E2EE 會廢掉這個模組一半的功能，也與 CLAUDE.md §7「所有計算與判斷收斂到 TypeScript 確定性規則引擎」直接衝突 —— 規則引擎在後端，讀不到資料就沒有引擎可言。

### 為什麼不是「維持明文，靠 DB 層 at-rest 加密」

如 §1 所述，磁碟層加密防不了 `pg_dump` 與備份外洩。帳本模式的 `CarbonReportDraft.plainContent` 接受這個等級是合理的（碳排活動數據，信任等級對齊 Journal / Voucher），但**保護強度不該低於它所保護的東西**，而身分證字號與銀行帳號高於碳排數據一個量級。

### 這個選擇防什麼、不防什麼

| | 防得住 | 防不住 |
|---|---|---|
| **欄位級加密** | `pg_dump`、備份檔外洩、DBA 或維運直連翻表、誤上傳的還原檔、唯讀複本外流 | 應用層被攻破（有 API 權限即可取得明文） |
| **存取稽核（補位）** | 事後可回答「誰在何時看過誰的資料」 | 無法即時阻止 |

**把邊界寫進 ADR，是因為「加密了」很容易被讀成「安全了」。**應用層被攻破這條路徑由授權檢查與 `AuditLogAction.READ` 負責，不是加密該解的問題。

---

## 🎯 4. 決策三：身分證的帳本內唯一性改掛盲索引 (Blind Index)

加密與唯一約束天生衝突：AES-GCM 的隨機 IV 讓同一明文的密文每次不同，`@@unique([accountBookId, nationalIdCipher])` 形同虛設。

但「同一帳本不得重複建檔同一人」這條業務規則不該因為加密而消失。因此另存一個決定性摘要欄位：

```prisma
nationalIdCipher String? @map("national_id_cipher")   // 明文只在這裡
nationalIdHash   String? @map("national_id_hash")     // HMAC-SHA256(pepper, 正規化值)

@@unique([accountBookId, nationalIdHash])
```

**用 HMAC 而不是裸 SHA-256**：台灣身分證字號的空間只有約 2.4 億組（10 個英文字首 × 性別碼 × 7 位流水號 + 檢查碼），裸雜湊被 dump 出去，用消費級硬體幾分鐘就能反查完整張表。pepper 由伺服器持有且不入庫，拿到 DB 的人沒有 pepper 就無法枚舉。

**pepper 與資料加密金鑰刻意分開管理**：pepper 一旦更換，所有 `nationalIdHash` 都要重算並重建唯一索引；資料金鑰輪替則只需重加密密文欄位。綁在同一把上，會讓「輪替金鑰」這件本來例行的事變成必須同時重建唯一索引的高風險作業。

`Dependent.nationalId` **不設**盲索引：眷屬本來就可能同時掛在不同員工下（夫妻同公司、子女由雙方分別申報），唯一約束在這裡是錯的業務規則。

---

## 🎯 5. 決策四：儲存層不變式（比照碳盤查）

密文能不能解開，完全取決於同一列的 `piiKeyVersion`。少了它，金鑰輪替之後沒有任何辦法試回來 —— 而重建那筆資料所需要的明文，正好只存在於那筆解不開的紀錄裡。

這與 `carbon_envelope_invariant.ts` 是**同一條規則的同一種形狀**：密文與解密線索必須一起寫入，或一起不寫。差別只在碳盤查的線索是 HD 派生路徑，這裡是金鑰代次。

因此 `src/repositories/hr_pii_invariant.ts` 擋在寫入端（而非讀取端 —— 讀取端無法區分「這欄本來就沒填」與「填了但 keyVersion 掉了」），檢查三個組合：

1. 有密文卻沒有 `piiKeyVersion` → 永久不可解密的終態
2. 有密文卻沒有 `piiAlgorithm` → 演算法演進後無從判斷該用哪套解
3. 沒有任何密文卻標了 `piiKeyVersion` → 不影響解密，但會讓金鑰輪替腳本的盤點永遠算不完

**即使目前不可觸發也要留**：走 repository 的正常路徑上，密文與 keyVersion 由 `encryptPii()` 的回傳值一起產生。留著的理由是 repository 是唯一的 DB 閘口，任何繞過 service 的呼叫（種子腳本、資料遷移、金鑰輪替作業、未來的批次匯入）都會經過這裡 —— **金鑰輪替腳本尤其：那支腳本的工作就是同時改寫密文與 keyVersion，是這條不變式最可能被違反、也是違反後果最不可逆的地方。**

---

## 🎯 6. 決策五：存取稽核沿用 `AuditLog`，不另建表

`AuditLogDataType` 新增 `EMPLOYEE_PII`、`AuditLogAction` 新增 `READ`。

- **`dataId` 一律填所屬的 `Employee.id`**，即使被讀的是 `BankAccount` 或 `Dependent` —— 個資外洩事故的調查軸線是「哪些**人**受影響」，不是「哪張表被讀」。填子表 id 會讓「這名員工的資料被誰看過」這個最常問的問題需要先反查父表。
- **`READ` 刻意只對 `EMPLOYEE_PII` 開放**：如果每次讀 Journal 都寫一筆 AuditLog，這張表會被沖爆，真正該被看見的個資存取反而被淹沒。
- 只有 **Tier 1 欄位的完整值**觸發稽核。Tier 2 加密與遮罩，但不強制留痕 —— 每查一次電話就寫一筆的噪音大於價值。

---

## 📊 7. 決策效益與已知取捨 (Consequences)

### 效益

1. **資料庫外洩不等於個資外洩**：dump 出去的是密文，沒有伺服器金鑰無法還原。
2. **不犧牲任何既有功能**：伺服器讀得到，薪轉、勞健保、排程通知照跑。
3. **與 repo 既有慣例同形**：不變式、`*Cipher` 命名、algorithm 版本化欄位都比照碳盤查，下一個人不必學第二套心智模型。
4. **業務規則保住**：身分證的帳本內唯一性以盲索引延續，未因加密而放棄。

### 已知取捨

1. **`birthday` 失去 DB 端日期查詢能力**（型別由 `DateTime?` 轉 `String?`）。目前沒有任何查詢用到它。未來若需要「本月壽星」這類需求，**加一個非敏感的衍生欄位（如 `birthMonth Int?`），不要為了查詢把 `birthday` 改回明文**。
2. **敏感欄位無法在 DB 端做模糊搜尋**（例如用電話尾碼找員工）。若確有需求，走盲索引的同一套路（HMAC + 完整值比對），不要退回明文。
3. **多一組必須管理的機密**：`HR_PII_KEY_V{n}` 與 `HR_PII_BLIND_INDEX_PEPPER`。遺失金鑰 = 資料永久不可讀，需納入既有的機密備份與輪替流程。
4. **應用層被攻破時加密無效**。這是本決策明確不涵蓋的範圍，由授權檢查與存取稽核補位。

---

## 🔜 8. 未來升級路徑

- **KMS / HSM 託管金鑰**：目前金鑰在環境變數，可平滑換成 KMS —— `loadKey()` 是唯一的取鑰入口，換掉它即可，呼叫端不動。
- **金鑰輪替自動化**：`piiKeyVersion` 已支援新舊並存，缺的是巡覽 `HrPiiTable` 清單重加密的批次作業。
- **欄位級授權**：目前遮罩與否由端點決定，未來可依角色（HR 承辦 vs 部門主管 vs 員工本人）細分到欄位。

---

> 相關文件：`prisma/schema.prisma`（人事區塊開頭的決策摘要）、`src/constants/hr_pii.ts`（分級與參數的單一來源）、`src/lib/hr_pii_crypto.ts`、`src/repositories/hr_pii_invariant.ts`、`documents/architecture/security_and_web3/sovereign_cloud_security_drp.md`。
