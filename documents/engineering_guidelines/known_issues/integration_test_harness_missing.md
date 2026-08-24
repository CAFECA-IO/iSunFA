# 已知問題：整合測試指南所描述的 harness 已不在 repo 中

**狀態**：**未解決**，處置方案未決（三案並列，見下方）
**發現於**：2026-08-21，假勤模組（PR #6672）review 第二輪追查 `documents/readme.md` 的死連結時
**影響範圍**：`documents/testing_and_qa/integration_test_guide.md` 全文；任何想照該指南寫整合測試的人

---

## 症狀

`integration_test_guide.md` 從第 31 行起描述一套整合測試骨架：

- `src/tests/` 目錄（含 `test_data_factory.ts`）
- `APITestHelper` 類（`createAuthenticatedHelper()` / `createWithEmail()`）
- `TestClient`
- 以 `supertest` 對 API 發請求

**這四樣東西目前一樣都不存在。**

```bash
$ ls src/tests
ls: cannot access 'src/tests': No such file or directory

$ grep -n supertest package.json
（零命中）

$ grep -rn "APITestHelper" src scripts
（零命中）
```

指南本身沒有任何標記說它描述的是一個已經被移除的東西 —— 讀的人會先照著寫，
再發現 import 不到。

## 什麼時候不見的

`3b40b6ae1`（2025-12-31，`initial rc3 version`，一次歷史重寫）：

```bash
$ git ls-tree -d 3b40b6ae1^ src/tests
040000 tree fef73e061c5c973301f4c9ee5155afa7e1bf6b87  src/tests

$ git ls-tree -d 3b40b6ae1 src/tests
（沒有輸出）
```

也就是說它不是被誰刪掉的，是重寫歷史時整棵沒有帶過來，而指南留了下來。

## 為什麼沒有人發現

`package.json` 的 test script：

```json
"test": "npm run typecheck && npm run lint && jest --passWithNoTests && npm run test:tz"
```

`--passWithNoTests` 讓「一支整合測試都沒有」**不會讓 CI 變紅**。缺口是無聲的 ——
沒有紅燈、沒有警告、也沒有 coverage 掉下來，因為從來沒有 coverage 門檻。

這是這一條之所以值得寫成文件的原因：症狀不是「測試失敗」，而是「什麼事都沒發生」。

## 三個處置方案（未決）

| 方案             | 做什麼                                                         | 代價 | 風險                                                                               |
| ---------------- | -------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------- |
| A. 復原          | 從 `3b40b6ae1^` 取回 `src/tests/`，補回 `supertest` 依賴       | 小   | 取回來的是 Pages Router 時代的 helper，對 App Router 的 route handler 不一定接得上 |
| B. 改寫          | 照 App Router 重寫一套（直接 import route handler，不經 HTTP） | 中   | 少了真正的 HTTP 層，`proxy.ts` 的行為驗不到                                        |
| C. 併入 bot 腳本 | 把整合驗證放進既有的 bot／煙霧測試流程，指南改寫成那一套       | 中   | 需要真環境，開發者本機跑不動，回饋週期變長                                         |

**在方案決定之前，`integration_test_guide.md` 不可當成可執行的指引。**
該檔頂端與 `documents/readme.md` 的兩處連結都已標註這件事。

## 這一條與假勤模組的關係

假勤模組（PR #6672）的測試全部是單元測試加介面替身，**沒有任何一支跑過真的 Prisma**。
其中 `leave_grant.repo.ts` 在測試裡只被 `jest.mock` 掉或被拿來取型別，本體從未執行過；
`leave_request.repo.ts` 也只有 `isActiveKeyViolation` 這支純函式被實際呼叫，
而餘額扣減、帳本寫入與排班投影那一段沒有。這兩支都是金流路徑。

替身是我們自己寫的，它同意我們對 Prisma 行為的假設 —— 假設錯了，測試不會知道。
這個缺口的根就是這一條：沒有 harness，就沒有地方放那種測試。

記於計畫書 §17；本文件負責說明「為什麼補不了」，而不只是「還沒補」。
