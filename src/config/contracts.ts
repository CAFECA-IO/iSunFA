import { Address, parseAbi } from "viem";

export const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN;
export const RPC_URL = "http://127.0.0.1:20024";

// Info: (20260124 - Tzuhan) ERC-4337 & RWA System Addresses from latest deployment
export const CONTRACT_ADDRESSES = {
  DYNAMIC_KYC_MEMBERSHIP: process.env
    .NEXT_PUBLIC_DYNAMIC_KYC_MEMBERSHIP_ADDRESS as Address,
  CREDIT_POINT: process.env.NEXT_PUBLIC_CREDIT_POINT_ADDRESS as Address,
  MEMBERSHIP_SYSTEM: process.env
    .NEXT_PUBLIC_MEMBERSHIP_SYSTEM_ADDRESS as Address,
  SUBSCRIPTION_MANAGER: process.env
    .NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS as Address,
  SCW_FACTORY: process.env.NEXT_PUBLIC_SCW_FACTORY_ADDRESS as Address,
  ENTRY_POINT: process.env.NEXT_PUBLIC_ENTRY_POINT_ADDRESS as Address,
  MISSION_BOARD: process.env.NEXT_PUBLIC_MISSION_BOARD_ADDRESS as Address,
  // Info: (20260807 - Luphia) C 案 Phase 1 每日 Ledger merkle 錨定（ADR 015），不持有資產
  LEDGER_ANCHOR: process.env.NEXT_PUBLIC_LEDGER_ANCHOR_ADDRESS as Address,
} as const;

export const ABIS = {
  // Info: (20251230 - Tzuhan) ERC-4337 EntryPoint (v0.6.0)
  ENTRY_POINT: parseAbi([
    "struct UserOperation { address sender; uint256 nonce; bytes initCode; bytes callData; uint256 callGasLimit; uint256 verificationGasLimit; uint256 preVerificationGas; uint256 maxFeePerGas; uint256 maxPriorityFeePerGas; bytes paymasterAndData; bytes signature; }",
    "function handleOps(UserOperation[] calldata ops, address payable beneficiary)",
    "function getNonce(address sender, uint192 key) external view returns (uint256 nonce)",
    "function getUserOpHash(UserOperation userOp) external view returns (bytes32)",
    "function getSenderAddress(bytes calldata initCode) external view returns (address)",
    "error FailedOp(uint256 opIndex, string reason)",
    "error FailedOpWithRevert(uint256 opIndex, string reason, bytes innerCallRet)",
    "event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed)",
  ]),

  // Info: (20251230 - Tzuhan) SCW Factory
  SCW_FACTORY: parseAbi([
    "event AccountCreated(address indexed scw, uint256 pubKeyX, uint256 pubKeyY, uint256 salt, string credentialId, string username, string imageUrl)",
    "function getAddress(bytes calldata credentialId, uint256 pubKeyX, uint256 pubKeyY, uint256 salt) public view returns (address)",
    "function createAccount(bytes calldata credentialId, uint256 pubKeyX, uint256 pubKeyY, uint256 salt, string calldata username, string calldata imageUrl) external returns (address)",
    /**
     * Info: (20260818 - Luphia) 刪掉公司帳戶的三條宣告（`createCompanyAccount`、
     * `getCompanyAddress`、`CompanyCreated` 事件）：部署的 `Fido2AccountFactory` 只有
     * 個人帳戶（`createAccount` / `getAddress` / `getAccountByCredentialId`），
     * 公司帳戶尚未上鏈。全 repo 沒有任何呼叫端。
     */
  ]),

  /**
   * Info: (20251230 - Tzuhan) Smart Contract Wallet (Personal/Company)
   *
   * Info: (20260818 - Luphia) 刪掉 `isValidSignature`：`Fido2Account` 沒有實作 ERC-1271
   * （合約與繼承鏈裡都沒有這支），沒有呼叫端。要支援 ERC-1271 得先改合約。
   */
  SCW: parseAbi([
    "function execute(address dest, uint256 value, bytes func) external",
  ]),

  // Info: (20260418 - Luphia) Evolved RWA Identity Registry & NFT Card
  DYNAMIC_KYC_MEMBERSHIP: parseAbi([
    "function getKYCLevel(address user) external view returns (uint8)",
    "function isBlacklisted(address user) external view returns (bool)",
    "function updateKYC(address user, uint8 _level) external",
    "function setBlacklistStatus(address user, bool _isBlacklisted) external",
    "function getPointsLimit(address user) external view returns (uint256)",
    "function mintCard(address to, string memory uri) external returns (uint256)",
    "function updateExperience(uint256 tokenId, uint256 addedExp) external",
  ]),

  /**
   * Info: (20251230 - Tzuhan) Credit Point Token
   *
   * Info: (20260818 - Luphia) 刪掉 13 條 `CreditPoint` 沒有的宣告（ERC-3643 樣板抄來的
   * `burn(address,uint256)` / `forcedTransfer` / 凍結 / pause / `compliance` 等，以及
   * `mint`——實際上是需要 ISC 抵押的 `collateralizedMint`）。
   *
   * 那份宣告不是無害的文件誤差：它讓「平台可以直接扣成員錢包」看起來成立，扣費第二層
   * 因此走了平台側 burn，而 viem 只在**送出交易時**才失敗。連帶的錯誤診斷（「合約層面
   * 做不到、要改合約」）抄進了六個檔案與五份文件，見 `lib/quota/personal_chain_credits.ts`
   * 的更正段。`abi_contract_parity.test.ts` 現在會擋下同一類新增。
   *
   * 補上四條**合約真的有、而且程式已經在用**的：先前這些散落在各處的 inline `parseAbi`
   * 裡重新宣告一次（`token.service` 的 `collateralizedMint` / `kycRegistry`、
   * `user_op_builder` 的 `transfer`），而重新宣告正是繞過這份 ABI 的做法。
   */
  CREDIT_POINT: parseAbi([
    "function collateralizedMint(address to, uint256 amount) external payable",
    "function burnAndUnlock(uint256 amount) external",
    "function setKYCRegistry(address _kycRegistry) external",
    "function kycRegistry() external view returns (address)",
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)",
  ]),

  // Info: (20260807 - Luphia) 每日 Ledger merkle 錨定（ADR 015 C 案 Phase 1）
  LEDGER_ANCHOR: parseAbi([
    "function commitAnchor(uint256 day, bytes32 dayRoot, bytes32 chainedRoot, uint256 entryCount) external",
    "event AnchorCommitted(uint256 indexed day, bytes32 dayRoot, bytes32 chainedRoot, uint256 entryCount)",
  ]),
};
