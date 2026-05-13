# 🔐 企業機密隔離與加密計算架構 (ZKP & Privacy-Preserving)

（Todo: 20260512 - 諮詢Luphia）

> **Date**: 2026-05-10
> **Author**: Tzuhan

> **Document Status**: Draft (For Enterprise & Web3 Audit)
> **Core Tech**: zk-SNARKs, ERC-4337, Merkle Trees

為應對國家級主權雲端與大型企業對「商業機密 (Trade Secrets)」的極致要求，iSunFA 的區塊鏈架構除具備不可竄改性外，更導入零知識證明架構。

## 1. 零知識證明 (Zero-Knowledge Proofs, ZKP) 規劃

**[Antigravity 推薦規劃 (尚未實作)]**：
當企業將財務或碳排數據的 Merkle Root 錨定至公有鏈或聯盟鏈時，面臨「透明度」與「隱私」的衝突。iSunFA 計畫透過 zk-SNARKs 解決：

- **範圍證明 (Range Proofs)**：企業可向四大會計師或政府證明「本期流動比率 > 120%」，而**無需揭露實際銀行存款餘額**。
- **計算完整性證明**：證明系統內的 `Stage 2 TypeScript 決定論管線` 確實被正確執行。

## 2. 金鑰管理系統 (KMS) 與 AA 錢包政策

**[現有實作]**：

- 外部使用者綁定與基本的登入授權。

**[Antigravity 推薦規劃 (尚未實作)]**：

- **多簽與權限分級 (Multi-Sig & RBAC on-chain)**：作為一個事後紀錄的財會系統，iSunFA 不負責資金撥付。但針對**「年度財報結算」**或**「ESG 碳排聲明提交政府」**等重大行為，系統要求必須由「製單人 (Maker)」與「會計主管/CPA (Checker)」兩把私鑰共同簽名，方能將 Merkle Root 錨定至區塊鏈。
- **災難恢復機制 (Social Recovery)**：透過預先設定的「監護人 (Guardians)」進行多簽恢復。
