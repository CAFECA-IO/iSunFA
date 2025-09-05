# **目標**

- 任何機器同一份程式碼，裝到**完全相同的相依樹**，開發者地端環境跟 CICD 保持一致。

- 更新有節奏、可預期，提前預警高風險。

- PR 導入的新依賴在合併前有安全與授權守門。

# **整體做法**

- 將開發功能跟維護這兩種工作拆開，在依賴出錯時另外拉出 branch 進行維護工作，避免影響開發功能。

1. **共享鎖檔 + 可重現安裝**：`package-lock.json` 入版控，CI/本機一律 `npm ci`。

2. **工具鏈鎖定**：`.nvmrc` + `"packageManager": "npm@x.y.z"`，消除 Node/npm 差異。

3. **PR 守門**：Dependency Review 開啟弱點與授權檢查，Critical 直接跳出提示訊息。

# 情境說明

- 建議使用 nvm 管理 node 版本，或者手動安裝 package.json 的 engines 指定 node 版本

### 新開發者初次 clone 專案 

1. `git clone` 
2. `nvm use`
3. `npm ci` 
4. 開始開發

### 現有開發者 lockfile 加入版控的第一次同步 develop branch（一次性）

1. rm -rf node_modules package-lock.json
2. git checkout develop && git pull
3. `nvm use`
4. `npm ci` 
5. 開始開發

### 開發者每日開發功能前

1. 確認 node 版本與 package-lock.json 的 node 版本一致，使用 `nvm use` 切換到 package-lock.json 的 node 版本
2. 同步 develop branch `git checkout develop && git pull`，如果 package.json 和 package-lock.json 有變更，則使用 `npm ci` 同步
3. 如果同步後 package.json 和 package-lock.json 有衝突，則另外開 branch 進行維護工作，並使用 `npm install --package-lock-only` 重建鎖檔

### 開發者添加新依賴 

在開發新功能時需要添加函式庫，則使用

1. 確認 node 版本與 package-lock.json 的 node 版本一致，使用 `nvm use` 切換到 package-lock.json 的 node 版本
2. 使用 `npm install PACKAGE_NAME --save` 添加新依賴
3. 檢查 package.json 和 package-lock.json 變更
4. 提交 package.json 和 package-lock.json 變更


### 開發者更新現有依賴 

- 讓 Dependabot 開 PR，或手動 npm i <pkg>@新版本 -E 在 deps 專用分支上更新，如果依賴樹出錯，可用 `npm install --package-lock-only` 重建鎖檔


### 開發者更新 node 版本

1. 手動修改 package.json 的 engines 指定 node 版本
2. 手動修改 .nvmrc 的 node 版本
3. `nvm install <node 版本>`
4. `nvm use`
5. 重新安裝 node_modules 和重新建立 package-lock.json`rm -rf node_modules package-lock.json && npm install`
6. 確認編譯跟測試成功

### 開發者移除依賴

1. 確認 node 版本與 package-lock.json 的 node 版本一致，使用 `nvm use` 切換到 package-lock.json 的 node 版本
2. 使用 `npm uninstall PACKAGE_NAME` 移除依賴而非手動編輯
3. 檢查 package.json 和 package-lock.json 變更
4. 提交 package.json 和 package-lock.json 變更


### 依賴衝突

1. 建立新的 branch 專門解決衝突
2. Git 先解 package.json 衝突（通常**選擇 main 的lockfile**）
3. rm -rf package-lock.json
4. 執行 `npm install` 安裝 node_modules 並重新建立 package-lock.json
   - 替代方案：拆開來做
   1. 執行 `npm install --package-lock-only` 讓 npm 依最終的 `package.json` 重建一致的鎖檔
   2. 安裝 `npm install` node_modules
5. 提交這次修復


### Lock file 損壞或不同步

- 另外開分支進行維護工作，千萬別在功能分支做這事。
1. 刪除 package-lock.json 檔案
2. 執行 `npm install --package-lock-only`（不安裝 node_modules，只重算鎖檔） 重新生成
3. 檢查生成的 lock file 差異

### 緊急修復方案（要刷新整棵樹）

開分支刪 node_modules＋package-lock.json → npm install → 功能測試 → 開 獨立 PR。
