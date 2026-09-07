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

因此 `src/lib/auth/custodial_signer.ts` 在伺服器端**合成**這份 assertion：組出 37 bytes 的 `authenticatorData`（rpIdHash + flags `0x01`，見下方 UV 修正 + signCount）與 `clientDataJSON`，再以託管私鑰簽 `sha256(authData || sha256(clientData))`。合約端因此完全不需要區分「真 passkey」與「託管簽章」——**鏈上不必改一行程式碼，也不必重新部署**。

`src/__tests__/custodial_signer.test.ts` 直接複刻上述三個驗證條件作為迴歸測試。

### 4. 金鑰保管

- 私鑰以 AES-256-GCM 加密後存於 `UserCustodialKey`（`src/lib/auth/key_vault.ts`）；主密鑰放在部署環境變數 `SECRET_VAULT_MASTER_KEY`，**不進 DB**（環境差異屬 env，營運設定才屬 DB）。
- 明文私鑰的生命週期僅限「解密 → 簽章」的數行程式碼，不寫檔、不入 log、不進 API 回應。
- 代簽端點只簽「伺服器自己決定」的內容（詳見下方補充章節的出處驗證），避免退化成簽章預言機。

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
3. **託管使用者的端到端加密由伺服器派生 PRF 替身，平台因此有能力解開他們的對話**（`UserEncryptionKey`）。2026-08-12 之前是「完全無法使用」，藥方寫的是「引導補綁 passkey」而那個功能不存在；現在改為提供同等功能但揭露差異 —— 完整決策、代價與後續工作見下方「補充（2026-08-12）」。補綁 passkey 仍然是取得非託管保證的唯一路徑。
4. ~~**既有的鏈上流程仍是前端驅動**~~ → **2026-08-10 已改接**，見下節。

## 補充（2026-08-10）：託管帳號的簽章 API

原本所有「需要使用者同意」的操作只有一種答案：對指定 challenge 的 FIDO2 簽章。而那個簽章同時扮演兩個角色——**授權證明**與**鏈上簽章**。託管帳號兩者都做不到。

### 做法：提供簽章 API，而不是逐一改端點

`POST /api/v1/auth/custodial/sign` 取代前端的 `fido2ClientService.startLogin()`。

關鍵在於它回傳的是**一份真正的 WebAuthn assertion**：託管帳號的 `User.pubKeyX / pubKeyY` 就是託管金鑰的公鑰，所以這份 assertion 通得過 `webAuthnService.verifySignature`，也通得過鏈上 `fido2_account.sol` 的 `FCL_WebAuthn.checkSignature`。

因此**所有既有流程維持「必須有有效簽章」，一個端點都不用改，也不需要任何 custody 繞過邏輯**。這比先前評估過的「逐一在 7 個端點加繞過」嚴格更安全：那個做法會在每個端點留下一條「託管帳號免簽」的路徑，等於 7 個需要各自維護的安全例外。

前端統一改用 `requestAssertion()`（`src/lib/auth/assertion_client.ts`）：passkey 帳號行為完全不變，託管帳號改打 API。新增需要簽章的流程時一律用這支，否則託管帳號會卡在一個永遠不會成功的系統對話框前面。

### 為什麼這不是簽章預言機

一支「你給什麼雜湊我就簽」的端點，等於讓任何拿到 session 的人（例如一次 XSS）簽出把錢包掏空的 UserOp。因此這支 API 只簽**伺服器自己決定**的內容：

- **orderId 模式**（付款）：呼叫端只能指名一張自己的未付款訂單。UserOp 的每一個欄位都由伺服器產生——收款方固定是 `MEMBERSHIP_SYSTEM`、金額取自訂單紀錄、nonce 與 gas 由 `prepareTransferUserOp` 決定。回應同時帶回那份 UserOp，呼叫端必須原封提交。
- **challenge 模式**：必須對得上該使用者的 `currentChallenge`、他自己某張 `PENDING` 訂單的 `challenge`（查詢綁 `userId`，且必須是伺服器產生的 43 字元 base64url），或一枚本站簽發、`sub` 綁定本人、且 `purpose` 不是 `ADMIN_ACTION` 的 `challengeToken`。

對不上就回 `AU000021` 拒絕。前端不必為此改變行為——這些 challenge 本來就是它手上那一份。

#### 20260811 修正：原本的 userOp 模式是一支任意動作簽章預言機

第一版接受呼叫端傳入**已組好的 UserOp**，只比對 `sender` 就代簽，其餘欄位（`callData`、`nonce`、gas、fee、`paymasterAndData`）原封交給 `EntryPoint` 算雜湊。`sender` 回答的是「哪個錢包」，`callData` 才回答「做什麼」——**驗了 who，沒驗 what**。

攻擊者拿到一枚 DeWT（存在 `localStorage`，XSS、惡意擴充、token 竊取任一即可）就能送
`callData = execute(CREDIT_POINT, 0, transfer(攻擊者, 全部餘額))`，通過 sender 檢查後取得一份合法簽章，直接丟給 bundler，**完全不需要再經過本站任何端點**；再對 `nonce = N, N+1 …` 各要一份，登出與撤銷 DeWT 都無法讓那些簽章失效（ERC-4337 的簽章只綁 nonce）。

值得記下來的是**為什麼會寫成這樣**：既有的 `blockchain_payment` 路徑同樣不檢查 `callData`，它只是「用送進來的 userOp 重算雜湊然後驗簽」。在 passkey 模型下那是安全的——私鑰在使用者裝置上，`callData` 是什麼由生物辨識授權，伺服器不需要管。託管模型把授權閘門從使用者的手指移到伺服器的 session 檢查，同一段邏輯就從安全變成致命。**沿用既有 pattern 時，要一併檢查那個 pattern 隱含的安全假設還成不成立。**

修法是移除整個介面而不是加防護：`resolveUserOpChallenge()` 已刪除，validator 加上 `.strict()`，多送一個 `userOp` 欄位會直接被拒絕。`src/__tests__/custodial_sign_provenance.test.ts` 有一條測試專門釘住「這個欄位不該存在」。

附帶修正的一件事：金額原本由前端決定（`prepareTransferUserOp(user.address, calculatedCost, orderId)` 的 `calculatedCost` 來自呼叫端），現在託管路徑一律取訂單自己的 `amount`。passkey 路徑仍沿用前端組的 UserOp（那是使用者親自授權的內容），因此「前端決定付多少」這件事在 passkey 路徑上仍然成立——那是既有行為，不在本次範圍內。

### 20260811 修正：challengeToken 缺少用途與對象綁定

`challengeToken` 的 payload 原本只有 `{ challenge }`：不綁使用者、不綁用途。於是「一枚有效的 token ＋ 一份對它的簽章」可以授權**任何**需要簽章的操作——用優惠券、發點數、改系統設定都成立。加上託管代簽之後，只要拿到某個託管管理員的 session 就能索取簽章並橫向套用到最高權限操作。

現在 token 同時承諾 `purpose`（`LOGIN` / `USER_ACTION` / `ADMIN_ACTION`）與 `sub`，驗證端必須指名自己預期的用途，`LOGIN` 以外一律比對 `sub`。並且**明確拒絕代簽 `ADMIN_ACTION`**：託管帳號的「同意」只是一張 session cookie，讓它授權最高權限操作等於沒有第二因素。管理員帳號本來就不該是託管型，這條規則讓那個前提變成程式碼而不是口頭約定。

（順帶修掉一個 100% 失效的 bug：route 層原本漏傳 `challengeToken` 給 service，所有走 `generateChallengeToken()` 的流程對託管帳號必然拋 `AU000021`。刻意在補上 purpose 綁定之後才修它——先修的話等於把一個被 bug 擋住的漏洞打開。）

### 20260811 修正：who / what 之外還有 when

A-1 與 H-2 分別補上了「哪個錢包」與「做什麼」。回頭檢查第三個維度——**這份授權何時失效**——結果是幾乎沒有守。

| 憑證                    | 有時效嗎 | 依據                                                     |
| ----------------------- | -------- | -------------------------------------------------------- |
| DeWT session            | 是，24h  | JWT `exp`                                                |
| OAuth state token       | 是，5m   | `OAUTH_STATE_TTL`                                        |
| `challengeToken`        | 是，5m   | `setExpirationTime("5m")`                                |
| `User.currentChallenge` | **否**   | 無 TTL 欄位；只在下次簽發時被覆寫，且代簽路徑不消耗它    |
| 訂單 challenge          | **否**   | 無 TTL、無過期 cron，只靠 `status = PENDING`             |
| **簽出的 UserOp**       | **否**   | ERC-4337 v0.6 的 struct 沒有 `validUntil` / `validAfter` |

最後一項是關鍵：**一份簽出來的 UserOp 沒有任何時間邊界**，它一直有效，直到它佔的 nonce 槽被用掉。`paymasterAndData` 是空的，所以連 paymaster 那條唯一能加時效的路也沒走。

而 `prepareTransferUserOp` 原本每次用隨機 nonce key（`Date.now() * Math.random()`）。隨機 key 幾乎必然沒被用過，`getNonce` 回傳 seq 0——於是**同一張訂單的每一份簽章各自佔一個獨立的槽，互不作廢、也不過期**。N 份簽章就是 N 筆各自可獨立動用的永久授權。

這件事對託管帳號特別要緊：A-1 之後攻擊者已經無法把錢導向自己（`callData` 只能付 `MEMBERSHIP_SYSTEM`、金額取自訂單），但**撤銷能力仍然不存在**。登出、換掉 DeWT、訂單被標記為已付，都無法讓一份已簽出的簽章失效——鏈上從不查我們的資料庫。殘餘攻擊是「偷到 DeWT + 一張 PENDING 訂單 → 每天最多 50 份簽章（限流）→ 在任意未來時點逐步把受害者 SCW 的餘額推給平台」，屬於 griefing 而非竊取。

**修法：nonce key 改由 `orderId` 決定性推導**（`deriveNonceKey`，`uint192(keccak256(orderId))`）。同一張訂單的所有簽章共用一個槽，第一份上鏈就消耗掉它，其餘**永久失效**。「N 筆可動用的授權」因此收斂成 1 筆，順帶也擋掉同一張訂單被重複付款。不同訂單得到不同 key，所以併發付款不會互相卡住——那正是當初改用隨機 key 想解決的問題，決定性推導同時滿足兩邊。

`src/__tests__/user_op_nonce_key.test.ts` 釘住這個性質。它必須有測試，因為壞掉的時候**付款照樣成功**，只有安全性默默消失。其中「不含任何隨機或時間成分」那條是舊實作必然失敗的地方（已實測：換回隨機版本會紅 2 條）。

真正的時間邊界（幾分鐘後就作廢）需要 paymaster 帶 `validUntil` 或改合約，屬於另一個量級，記入下方後續工作。

### 20260811 修正：UV 旗標不該由伺服器代為聲稱

`AUTHENTICATOR_FLAGS` 原本是 `0x05`（UP | UV），也就是對外聲稱「本次已完成使用者驗證」。託管金鑰在伺服器上，簽的當下沒有任何使用者驗證行為。改成 `0x01`（只設 UP）：合約端 `fcl_webauthn.sol` 只驗 UP mask，後端 `verifyAuthentication` 目前也不要求 UV，因此不影響驗證通過。UV 這個位元的價值就在於它可信，應該保留給真的做過驗證的 passkey。

### 格式往返的風險與防護

這個設計的前提是 assertion 的格式與真實 authenticator 完全一致。任一環節不符（DER 編碼、base64url 與 base64、`clientDataJSON` 的欄位位移）都會靜默失敗，症狀是「簽章驗不過」這種很難定位的錯誤。

`src/__tests__/custodial_assertion_roundtrip.test.ts` 因此複刻整條真實路徑：`signChallenge` → 組成 `AuthenticationJSON` → 前端 `getWebAuthnSignatureStruct` 解析 → 後端 `verifyAuthentication` 驗證。其中一條刻意連簽 24 把金鑰，確保 DER 有號數前綴（最高位為 1 時要補 `0x00`）兩種情況都被涵蓋——漏掉那個前綴大約每四次簽章壞一次，是典型的間歇性 bug。

`clientDataJSON` 的 `origin` 取自 `NEXT_PUBLIC_APP_URL`，與 `fido2_server` 的 `configuredOrigin` 同源，因此兩邊永遠一致。

### 必須正視的取捨

**託管帳號的付款沒有第二因素。** 能授權動作的只有已登入的 session。這是選擇託管式的直接後果——伺服器持有私鑰，session 有效時它本來就能代簽。出處驗證把「可以簽任何東西」縮小到「只能簽伺服器發出過的 challenge」，但無法把「session 被盜用」這件事本身擋掉。

每一次代簽都寫入 log。欄位包含使用者、位址、模式、`orderId`、challenge，以及實際簽下去的 `sender` / `nonce` / `callData`——只記 challenge 是不夠的：付款模式下它只是一個雜湊，事後看不出簽掉了什麼。這類授權沒有第二因素，紀錄是唯一的追查依據。

代簽端點另有限流（`RateLimitBucketEnum.SIGNING`，以 userId 為維度，預設每分鐘 5 次 / 每日 50 次）。它產出的是可直接送 bundler 的資金授權，無限呼叫等於讓「偷到一枚 DeWT 就批次囤簽章」變成零成本；撞到上限會留下 warn log。

若要縮小與 passkey 帳號的差距，可行方向是為高風險操作加獨立的第二因素（TOTP、Email 確認連結），或引導補綁 passkey——但後者受限於 SCW 的擁有者公鑰無法更換（`fido2_account.sol` 在 `initialize()` 設定 `pubKeyX`，沒有 rotate 函式），補綁會得到不同的錢包位址，屬於需要資料遷移的產品決策。

## 後續工作

- [x] 既有需要簽章的流程改接託管簽章 API（見上方補充章節）。
- [x] 前端所有取簽章的呼叫點改用 `requestAssertion()`，並加 ESLint 護欄（`no-restricted-syntax`）擋住元件層直呼 `fido2ClientService.startLogin`。登入、passkey 註冊、部署精靈與管理員操作以檔案層級例外排除，理由寫在 `eslint.config.mjs`。
- [ ] 帳號設定頁：顯示已綁定的登入方式、提供綁定 / 解除綁定，以及「託管 → 非託管」的 passkey 升級流程（把 SCW 擁有者換成 passkey 公鑰後廢除託管金鑰）。**這件事目前擋住了解綁功能**：`unlinkIdentity` 只能以「有沒有託管金鑰列」反推「有沒有 passkey」，而本專案沒有獨立的 authenticator 表、也還沒實作「補綁後廢除託管金鑰列」，因此社交註冊使用者永遠被視為沒有 passkey，解綁對他們等於不存在（方向上 fail closed，不會鎖死帳號）。
- [ ] 主密鑰移往 KMS 並實作 `keyVersion` 輪替。`keyVersion` 目前**只寫不讀**（`openSecret` 不參考它），欄位存在但輪替機制不存在，詳見 `key_vault.ts` 的註解。
- [ ] `/oauth/link` 加 step-up 驗證：目前新增登入方式只憑一張存在 `localStorage` 的 DeWT，不要求重做 FIDO2 assertion。XSS 讀到 DeWT 即可綁上攻擊者的 Google 帳號，且受害者換掉 passkey、清掉 session 之後攻擊者仍能登入。
- [ ] 首次社交註冊先在 transaction 內以 `(provider, providerUserId)` 佔位再部署 SCW。SCW 位址是 CREATE2 決定性的，不需先部署就能算出；目前部署在唯一鍵競爭之前，同一帳號兩個分頁同時首次登入會在鏈上留下一個無人可控的合約。
- [ ] `state` 加 `jti` 一次性紀錄或綁定 httpOnly cookie；目前防重放完全外包給 Google 對 authorization code 的一次性。
- [ ] **付款授權的真正時效**。nonce key 決定性推導已把「同一張訂單的 N 份永久授權」收斂成 1 份，但那 1 份仍然沒有到期時間。要讓簽章在幾分鐘後自動作廢，需要 paymaster 帶 `validUntil`（`paymasterAndData` 目前是空的）或在 SCW 端加時間檢查。
- [ ] **challenge 沒有一次性消耗**。三條出處驗證都是純比對，成功後不失效：`currentChallenge` 沒有 TTL 欄位、代簽路徑也不清空它（清掉會讓下游端點的驗證失敗，因為它們自己要驗完才 `clearChallenge`）；訂單 challenge 同樣沒有 TTL。目前的邊界是「訂單必須是 `PENDING`」與代簽端點的限流，不是一次性。乾淨的做法是讓需要代簽的流程一律走帶 `exp` 的 `challengeToken`，而不是依賴 `currentChallenge`。
- [ ] `IOAuthProvider` 補 `nonce` 欄位。現在走 code flow + 後端交換，replay 風險低，但介面上沒有 nonce 的位置，一旦加入使用 `response_mode=form_post` 的 provider（Apple 即是）就沒有防 id_token 注入的機制可用。
- [ ] 服務條款與隱私權政策補充託管錢包的保管責任說明。

### 「新增 provider 只需一個實作 + 兩個環境變數」的修正

這個說法過於樂觀。實際至少要動 6 處：`AuthProvider` enum、`registry`、`SystemSettingKey` 與其定義、`PROVIDER_LABEL_KEYS`（`Record` 必填，不加會編譯失敗）、5 個語系的 i18n、以及 `emailVerified` 閘門（那是 Google 專屬語意，卻寫在 provider-agnostic 的 service 層）。

而且 Apple 兩點都不符合：它的 `client_secret` 是需要現算的 ES256 JWT，塞不進「兩個字串設定」；它走 `response_mode=form_post`，而 callback 頁只從 `searchParams` 取 `code`，接不到 POST body。

---

## 補充（2026-08-12）：託管帳號的 PRF 替身

### 問題

上面「負面」第 3 條開的藥方是「引導使用者補綁 passkey」，而那個功能到今天還不存在（`oauth.service.unlinkIdentity` 的註解記著同一件事：`User` 沒有 credentialId 欄位、沒有 authenticator 表，也沒有任何刪除託管金鑰列的程式碼）。實際結果是 **Google 註冊的帳號完全用不了 `/user/carbon_chatbot` 的加密對話**。

而它失敗的方式比「不能用」更糟。`getPrfSecret()` 直接呼叫 `navigator.credentials.get()`，託管帳號面對的是一個**開得起來但永遠不會成功**的 passkey 系統對話框；使用者關掉它，瀏覽器丟 `NotAllowedError`，不是 `ChatroomUnsupportedDeviceError`，於是落到通用分支。就算走到那個具名錯誤，文案也是「您的裝置或瀏覽器不支援…建議改用 Android 上的 Chrome，或支援 PRF 的實體安全金鑰」——**裝置沒問題，是帳號沒有 passkey**，那句話會把人送去買一支解決不了問題的硬體。

這正是本 ADR 對 `startLogin` 寫過的那句警告：「新增需要簽章的流程時一律用 `requestAssertion()`，否則託管帳號會卡在一個永遠不會成功的系統對話框前面。」那句話對 PRF 一字不改地成立，而 PRF 這條路徑當初沒有跟著改。

### 決策

比照簽章的做法，把 PRF 秘密的取得也統一到一支 lib：

|          | passkey 帳號                              | 託管帳號                           |
| -------- | ----------------------------------------- | ---------------------------------- |
| 簽章     | `fido2ClientService.startLogin()`         | `POST /api/v1/auth/custodial/sign` |
| PRF 秘密 | `navigator.credentials.get()`（PRF 擴充） | `POST /api/v1/auth/custodial/prf`  |

前端統一呼叫 `requestPrfSecret()`（`src/lib/auth/assertion_client.ts`），`chatroom_key_manager.ts` 因此不必知道帳號是哪一種。包裝／解包主私鑰的流程完全沒有分岔。

伺服端以 `VaultPurpose.CUSTODIAL_PRF` 對 `SECRET_VAULT_MASTER_KEY` 做 domain separation，再以 `HMAC-SHA256(子金鑰, userId:prfSalt)` 派生 32 bytes。`userId` 與 `prfSalt` 都必須進輸入：少了前者，所有託管帳號共用同一個秘密；少了後者，重新註冊金鑰拿不到新的秘密。

**刻意不從託管簽章私鑰派生。** 那會讓「解開對話」與「動用資金」共用同一份金鑰材料，而兩者的外洩後果完全不同；也不必為了加密去解封簽章私鑰，擴大它的暴露面。

**passkey 帳號一律拒絕這支端點**（在 service 檢查 `resolveCustodyType`，不靠前端傳不傳 `custody`）。否則它就是一條把非託管帳號降級成「伺服器可解密」的路徑。

### 這個決策的代價

**伺服器有能力解開託管帳號的對話內容。** 這與託管錢包本來的信任模型一致——平台已經持有那些帳號的簽章私鑰——但它確實不是 passkey 帳號那種「伺服器連解密的能力都沒有」。

因此**介面文案必須分兩種**：`carbon_chatbot.unlock_hint` 保留給 passkey 帳號，託管帳號改用 `unlock_hint_custodial`，明說金鑰由平台代管、平台在技術上具備解密能力，並指出「僅本人可解密」需改用 passkey 帳號。**在使用者按下解鎖之前就要講清楚，而不是寫在條款裡。**

影響半徑跟著綁在主密鑰上：`SECRET_VAULT_MASTER_KEY` 遺失，託管帳號的對話與託管錢包一起失效。這一點與既有的託管私鑰相同，不是新增的風險。

### 這不取代補綁 passkey

補綁 passkey 仍然是託管使用者真正取得非託管保證的唯一路徑，也仍然是「帳號安全設定」那個功能的一部分。這個補充解的是「在那之前完全不能用，而且被告知了錯誤的原因」。補綁完成之後，那些帳號應改回 passkey 路徑，並廢除託管金鑰列——**屆時已用 PRF 替身加密的既有對話需要重新包裝主私鑰**（用新的 passkey PRF 秘密重新 wrap 同一把主私鑰即可，對話內容不必重新加密）。這一步屬於那個功能的範圍。

### 補充決策（2026-08-12 review 回應）：包裝來源必須被記錄

`UserEncryptionKey.algorithm` 這個欄位的註解本來就寫著「包裝/派生演算法標記（版本化）」，但兩條路徑原本都留在同一個預設值 `WebAuthnPRF-…` —— 對託管列來說那是**錯的**，而同一個 model 上「僅密文入庫，伺服器無法解開」那句話對託管列也已經不成立。

沒有這個標記，三件事做不到：

1. **稽核回答不了「哪些對話的金鑰在平台手上」** —— 只能回頭 join `UserCustodialKey` 推論當時的 custody，而 custody 會變。
2. **上面承諾的「補綁 passkey 後重新包裝」找不出要重包哪些列。**
3. **custody 一翻轉就是靜默的資料損失** —— 補綁 passkey 若廢除託管金鑰列，`resolveCustodyType` 回 PASSKEY、前端改走 passkey 派生，同一個 salt 得到不同的秘密，`unwrapMasterKey` 必然失敗。使用者看到的是一句通用的「解鎖失敗」，而真相是「這份對話已經解不開了」。

因此：註冊時寫入來源標記（`src/constants/chatroom_key.ts` 是值域的單一來源，passkey 的值**必須**與 schema `@default` 一字不差，既有列都靠它寫入），解包前比對標記與當下的 custody，不一致即拋具名的 `ChatroomKeySourceMismatchError` 並顯示「需要金鑰移轉」而不是「解鎖失敗」。版本寫在標記裡（`CustodialPRF-v1-…`）並一併餵進 HMAC —— 否則「版本」只是註解。

派生的輸入綁 **salt 的 bytes** 而非它的 base64 字串：另一條路徑吃的就是 bytes，若這裡綁字串表示，任何編碼上的改動都會換掉秘密，而**失敗方式不對稱** —— passkey 帳號毫無症狀，只有託管帳號的對話永久解不開。

`custody` 尚未載入時**不猜**：UI 停用解鎖按鈕並顯示中性文案，`requestPrfSecret` 對未知 custody 拋錯。未知時倒向「不給任何保證」而不是「給較強的保證」—— 給錯的那一種，正好發生在本 ADR 要求「在使用者按下解鎖之前就講清楚」的那個時刻。
