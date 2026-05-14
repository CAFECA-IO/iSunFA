# 🔐 企業機密隔離與加密計算架構 (ZKP & Privacy-Preserving)

> **Date**: 2026-05-14
> **Author**: Tzuhan
> **Document Status**: Active (Architectural Blueprint)
> **Core Tech**: ZKP FHM (Fully Homomorphic Mechanism / 同態加密), ERC-4337, Laria IPFS

為應對國家級主權雲端與大型企業對「商業機密 (Trade Secrets)」的極致要求，iSunFA 的區塊鏈架構除具備不可竄改性外，更規劃導入基於零知識證明與同態加密的隱私防護。

## 1. 零知識證明與同態加密 (ZKP FHM) 實作規劃

**[目前狀態：尚未實作 (Pending)]**
為了確保第一階段系統開發時的除錯性與透明度（因為密文在開發階段會導致 `console.log` 與除錯極端困難），FHM 同態加密機制目前**刻意暫緩實作**。必須等待核心的會計引擎與混合決策管線完全穩定後，才會將其整合進去。

**[架構定位與攔截點 (Interception Point)]**：
未來的 FHM (同態加密) 將會精準實作在 `laria.ts` (去中心化儲存模組) 的進入點之前：
- **寫入 IPFS 前 (Pre-IPFS Hook)**：企業的敏感財務數據與碳排明細在寫入 Laria / IPFS 節點前，會先透過 FHM 演算法進行同態加密。儲存在分散式網路上的檔案將會是**「可以進行特定數學運算的密文」**。
- **讀取與驗證 (Post-IPFS Hook)**：Worker 與區塊鏈合約能在不解密原始內容的情況下，利用同態加密的特性驗證數據或產生彙總結果，最後再由具備權限的客戶端進行解密，達成真正的「可用不可見」與零知識證明架構。

## 2. 金鑰管理系統 (KMS) 與 AA 錢包政策

**[現有實作]**：

- 外部使用者綁定與基本的登入授權。

**[Antigravity 推薦規劃 (尚未實作)]**：

- **多簽與權限分級 (Multi-Sig & RBAC on-chain)**：作為一個事後紀錄的財會系統，iSunFA 不負責資金撥付。但針對**「年度財報結算」**或**「ESG 碳排聲明提交政府」**等重大行為，系統要求必須由「製單人 (Maker)」與「會計主管/CPA (Checker)」兩把私鑰共同簽名，方能將 Merkle Root 錨定至區塊鏈。
- **災難恢復機制 (Social Recovery)**：透過預先設定的「監護人 (Guardians)」進行多簽恢復。
