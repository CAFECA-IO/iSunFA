# ADR 016: 第三方登入與託管錢包 (Third-party Login & Custodial Wallet)

> **Date**: 2026-08-09
> **Author**: Luphia
> **Status**: Proposed
> **關聯程式碼**: `src/lib/auth/oauth/`、`src/lib/auth/custodial_signer.ts`、`src/services/oauth.service.ts`

---

## Context（脈絡）

系統原本只有一種登入方式：FIDO2 passkey。其身分模型是**金鑰即帳號**——

1. 使用者在瀏覽器產生 passkey，得到一組 P-256 金鑰對。
2. 前端把公鑰座標 `(x, y)` 與 `credentialId` 餵給 `fido2_account_factory.sol`，以 CREATE2 **決定性推導**出 SCW 位址。
3. 該位址寫入 `User.address`（`@unique`），成為所有業務資料（`Journal` / `Voucher` / `EsgRecord` / `TeamMember` / `Order`）的根。
4. 每一筆鏈上動作都是一個 UserOp，由 `fido2_account.sol` 的 `_validateSignature` 走 `FCL_WebAuthn.checkSignature` 驗證使用者的 passkey 簽章。
5. 端到端加密資料的主私鑰以 passkey PRF 包裝（`UserEncryptionKey`），伺服器連解密的能力都沒有。

這是一個徹底非託管的設計，但代價是**沒有 passkey 就沒有帳號**。要支援 Google 登入，必須先回答一個問題：Google 給的是一個 `sub` 字串，拿不到任何 P-256 私鑰，那這位使用者的 SCW 從哪來？

可選方案：

- **A. 綁定式**：Google 只能登入「已用 passkey 註冊過」的帳號。維持非託管，但無法讓新使用者只用 Google 註冊。
- **B. 託管式**：伺服器為 Google 使用者產生並保管 P-256 私鑰，代為部署 SCW、代簽 UserOp。UX 完整，代價是伺服器持有私鑰。
- **C. 純 Web2 Session**：Google 使用者沒有錢包，只能用非鏈上功能。但現況幾乎所有業務資料都掛在 `address` 上，改動面反而最大。

## Decision（決策）

**採 B（託管式），並把「通用 provider 層」與「託管金鑰」兩件事拆乾淨。**

### 1. 身分層：provider 無關

- `UserIdentity`（`provider` + `providerUserId`，全域唯一）記錄第三方綁定，一個 `User` 可綁多個 provider。
- `IOAuthProvider` 介面（`src/interfaces/oauth.ts`）定義 `buildAuthorizationRequest` / `fetchProfile`，各家實作把私有欄位收斂成 `IOAuthProfile`。
- `src/lib/auth/oauth/registry.ts` 是唯一註冊表。新增 Apple / Microsoft / LINE 只需多一個實作 + 環境變數，Service、API、前端都不動。
- 未設定金鑰的 provider 不會出現在 `/api/v1/auth/oauth/providers`，前端因此不會渲染壞掉的按鈕。

### 2. 帳號對應：只認 `providerUserId`，絕不用 email 自動合併

既有 passkey 使用者的 `User` 上**沒有 email 欄位**，本來就無從比對；而「以 email 自動合併帳號」等於讓 Google 帳號被盜就能接管一個 passkey 帳號。因此：

- 登入時只以 `(provider, providerUserId)` 查 `UserIdentity`。查無 → 建立新帳號。
- 既有使用者要多一種登入方式，必須在**已登入狀態**下呼叫 `POST /api/v1/auth/oauth/link` 明確綁定。
- 託管使用者（無 passkey）不得解除最後一個第三方綁定，否則等同自我鎖死帳號。

### 3. 託管金鑰：伺服器合成 WebAuthn assertion

這是本 ADR 技術上最關鍵的一點。`fido2_account.sol` 驗的不是「對 userOpHash 的 ECDSA 簽章」，而是**一次完整的 WebAuthn assertion**：

```solidity
FCL_WebAuthn.checkSignature(
    authenticatorData,
    bytes1(0x01),      // User Presence
    clientDataJSON,
    userOpHash,        // challenge 就是 userOpHash 本身
    challengeIndex,
    rs, pubKeyX, pubKeyY
);
```

它要求簽章覆蓋 `sha256(authenticatorData || sha256(clientDataJSON))`，且 `clientDataJSON` 中 `challenge` 欄位等於 `base64url(userOpHash)`。

因此 `src/lib/auth/custodial_signer.ts` 在伺服器端**合成**這份 assertion：組出 37 bytes 的 `authenticatorData`（rpIdHash + flags `0x05` + signCount）與 `clientDataJSON`，再以託管私鑰簽 `sha256(authData || sha256(clientData))`。合約端因此完全不需要區分「真 passkey」與「託管簽章」——**鏈上不必改一行程式碼，也不必重新部署**。

`src/__tests__/custodial_signer.test.ts` 直接複刻上述三個驗證條件作為迴歸測試。

### 4. 金鑰保管

- 私鑰以 AES-256-GCM 加密後存於 `UserCustodialKey`（`src/lib/auth/key_vault.ts`）；主密鑰放在部署環境變數 `SECRET_VAULT_MASTER_KEY`，**不進 DB**（環境差異屬 env，營運設定才屬 DB）。
- 明文私鑰的生命週期僅限「解密 → 簽章」的數行程式碼，不寫檔、不入 log、不進 API 回應。
- 代簽端點只接受「伺服器自己發出過」的 challenge（詳見下方補充章節的出處驗證），避免退化成簽章預言機。

### 5. 授權碼流程：後端交換，DeWT 不經網址列

`start` 回傳 `authorizationUrl` 與一枚 HS256 簽章的短效 state token（含 state 與 PKCE `code_verifier`），前端存 `sessionStorage` 後整頁導向 provider；provider 導回 `/auth/callback/[provider]` 後，前端把 `code` + `state` + state token **POST** 給後端交換 DeWT。

刻意不用「後端 302 帶 token 回前端」：DeWT 若出現在網址列，就會滲進瀏覽器歷史、Referer 標頭與伺服器 access log。

`redirectUri` 必須與 `NEXT_PUBLIC_APP_URL` 同源，阻擋 open redirect 把授權碼導向攻擊者網域。

## Consequences（後果）

### 正面

- 新使用者可以只用 Google 完成註冊，並立即擁有可用的 SCW 與完整鏈上功能。
- 智能合約零改動、零重新部署。
- 新增登入方式的邊際成本降到「一個 provider 實作 + 兩個環境變數」。

### 負面與風險（必須正視）

1. **託管使用者的私鑰由平台持有**，與 passkey 使用者的非託管保證不同。這是產品層的取捨，不是實作瑕疵——條款與 UI 需明確揭露兩者差異。
2. **`SECRET_VAULT_MASTER_KEY` 是單點故障**。遺失 = 所有託管錢包永久失效；外洩 = 所有託管錢包遭接管。正式環境應移往 KMS / HSM，並建立輪替程序（`UserCustodialKey.keyVersion` 已預留欄位）。此金鑰在 ADR 017 後亦用於加密 DB 內的系統設定秘密值，以 `VaultPurpose` 做 KDF domain separation。
3. **託管使用者無法使用 passkey PRF 端到端加密**（`UserEncryptionKey`）。這類功能必須在 UI 上引導使用者補綁 passkey。
4. ~~**既有的鏈上流程仍是前端驅動**~~ → **2026-08-10 已改接**，見下節。

## 補充（2026-08-10）：託管帳號的簽章 API

原本所有「需要使用者同意」的操作只有一種答案：對指定 challenge 的 FIDO2 簽章。而那個簽章同時扮演兩個角色——**授權證明**與**鏈上簽章**。託管帳號兩者都做不到。

### 做法：提供簽章 API，而不是逐一改端點

`POST /api/v1/auth/custodial/sign` 取代前端的 `fido2ClientService.startLogin()`。

關鍵在於它回傳的是**一份真正的 WebAuthn assertion**：託管帳號的 `User.pubKeyX / pubKeyY` 就是託管金鑰的公鑰，所以這份 assertion 通得過 `webAuthnService.verifySignature`，也通得過鏈上 `fido2_account.sol` 的 `FCL_WebAuthn.checkSignature`。

因此**所有既有流程維持「必須有有效簽章」，一個端點都不用改，也不需要任何 custody 繞過邏輯**。這比先前評估過的「逐一在 7 個端點加繞過」嚴格更安全：那個做法會在每個端點留下一條「託管帳號免簽」的路徑，等於 7 個需要各自維護的安全例外。

前端統一改用 `requestAssertion()`（`src/lib/auth/assertion_client.ts`）：passkey 帳號行為完全不變，託管帳號改打 API。新增需要簽章的流程時一律用這支，否則託管帳號會卡在一個永遠不會成功的系統對話框前面。

### 為什麼這不是簽章預言機

一支「你給什麼雜湊我就簽」的端點，等於讓任何拿到 session 的人（例如一次 XSS）簽出把錢包掏空的 UserOp。因此這支 API 只簽**伺服器自己發出過**的 challenge：

- **userOp 模式**：雜湊由伺服器向 `EntryPoint` 重新計算，且 `sender` 必須等於該使用者的 SCW 位址（由儲存的 `credentialId` + 公鑰重新推導）。無法叫它替別人的錢包簽名。
- **challenge 模式**：必須對得上該使用者的 `currentChallenge`、他自己某張未結案訂單的 `challenge`（查詢綁 `userId`），或一枚本站簽發且未過期的 `challengeToken`。

對不上就回 `AU000021` 拒絕。前端不必為此改變行為——這些 challenge 本來就是它手上那一份。

### 格式往返的風險與防護

這個設計的前提是 assertion 的格式與真實 authenticator 完全一致。任一環節不符（DER 編碼、base64url 與 base64、`clientDataJSON` 的欄位位移）都會靜默失敗，症狀是「簽章驗不過」這種很難定位的錯誤。

`src/__tests__/custodial_assertion_roundtrip.test.ts` 因此複刻整條真實路徑：`signChallenge` → 組成 `AuthenticationJSON` → 前端 `getWebAuthnSignatureStruct` 解析 → 後端 `verifyAuthentication` 驗證。其中一條刻意連簽 24 把金鑰，確保 DER 有號數前綴（最高位為 1 時要補 `0x00`）兩種情況都被涵蓋——漏掉那個前綴大約每四次簽章壞一次，是典型的間歇性 bug。

`clientDataJSON` 的 `origin` 取自 `NEXT_PUBLIC_APP_URL`，與 `fido2_server` 的 `configuredOrigin` 同源，因此兩邊永遠一致。

### 必須正視的取捨

**託管帳號的付款沒有第二因素。** 能授權動作的只有已登入的 session。這是選擇託管式的直接後果——伺服器持有私鑰，session 有效時它本來就能代簽。出處驗證把「可以簽任何東西」縮小到「只能簽伺服器發出過的 challenge」，但無法把「session 被盜用」這件事本身擋掉。

每一次代簽都寫入 log（使用者、位址、challenge），這類授權沒有第二因素，紀錄是唯一的事後追查依據。

若要縮小與 passkey 帳號的差距，可行方向是為高風險操作加獨立的第二因素（TOTP、Email 確認連結），或引導補綁 passkey——但後者受限於 SCW 的擁有者公鑰無法更換（`fido2_account.sol` 在 `initialize()` 設定 `pubKeyX`，沒有 rotate 函式），補綁會得到不同的錢包位址，屬於需要資料遷移的產品決策。

## 後續工作

- [x] 既有需要簽章的流程改接託管簽章 API（見上方補充章節）。
- [ ] 帳號設定頁：顯示已綁定的登入方式、提供綁定 / 解除綁定，以及「託管 → 非託管」的 passkey 升級流程（把 SCW 擁有者換成 passkey 公鑰後廢除託管金鑰）。
- [ ] 主密鑰移往 KMS 並實作 `keyVersion` 輪替。
- [ ] 服務條款與隱私權政策補充託管錢包的保管責任說明。
