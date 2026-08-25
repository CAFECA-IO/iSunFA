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
    "event CompanyCreated(address indexed scw, uint256[][] owners, uint256 threshold, uint256 salt, string name, string imageUrl)",
    "function createCompanyAccount(uint256[][] owners, uint256 threshold, uint256 salt, string name, string imageUrl) external returns (address)",
    "function getCompanyAddress(uint256[][] owners, uint256 threshold, uint256 salt) public view returns (address)",
  ]),

  // Info: (20251230 - Tzuhan) Smart Contract Wallet (Personal/Company)
  SCW: parseAbi([
    "function execute(address dest, uint256 value, bytes func) external",
    "function isValidSignature(bytes32 hash, bytes memory signature) public view returns (bytes4)",
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
    /**
     * Info: (20260819 - Luphia) 訂閱會員卡的續期／改方案走換 URI，不重鑄
     * （重鑄會讓同一個訂閱在鏈上留下兩張都看起來有效的卡）。
     */
    "function setTokenURI(uint256 tokenId, string memory uri) external",
    /**
     * Info: (20260819 - Luphia) 方案以**鏈上為準**（產品決定 20260819），因此需要讀卡：
     * `balanceOf` 當閘門（回 0 就不必再查任何東西）、`ownerOf` 確認現在還在他手上
     * （卡片可被持有人自行轉走）、`tokenURI` 取 metadata。三支皆來自 vendored 的
     * OpenZeppelin ERC721 / ERC721URIStorage（繼承鏈，見 abi_contract_parity 測試）。
     */
    "function balanceOf(address owner) view returns (uint256)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function tokenURI(uint256 tokenId) view returns (string)",
    /**
     * Info: (20260821 - Luphia) `_safeMint` 對沒有 `onERC721Received` 的收受人
     * 的 revert（review #6687 阻擋級的實測錯誤，selector 0x64a0ae92）。
     * 宣告進 ABI，`nftSyncError` 才存得下人話而不是一串 hex——worker 的探針
     * 讓它不該再發生，但「不該發生的失敗」正是最需要說得出原因的那種。
     */
    "error ERC721InvalidReceiver(address receiver)",
    /**
     * Info: (20260819 - Luphia) 鑄造後從收據回讀 tokenId 用。
     * `mintCard` 的回傳值拿不到——`writeContract` 只給交易哈希，
     * 而 `simulateContract` 給的是「模擬當下」的號碼，中間有人鑄一張就對不上。
     */
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  ]),

  // Info: (20251230 - Tzuhan) Credit Point Token
  CREDIT_POINT: parseAbi([
    "function mint(address to, uint256 amount) external",
    "function setKYCRegistry(address _kycRegistry) external",
    "function burn(address userAddress, uint256 amount) external",
    "function forcedTransfer(address from, address to, uint256 amount) external returns (bool)",
    "function freezePartialTokens(address userAddress, uint256 amount) external",
    "function unfreezePartialTokens(address userAddress, uint256 amount) external",
    "function setAddressFrozen(address userAddress, bool freeze) external",
    "function isFrozen(address userAddress) external view returns (bool)",
    "function getFrozenTokens(address userAddress) external view returns (uint256)",
    "function pause() external",
    "function unpause() external",
    "function paused() external view returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function compliance() external view returns (address)",
    "function identityRegistry() external view returns (address)",
  ]),

  // Info: (20260807 - Luphia) 每日 Ledger merkle 錨定（ADR 015 C 案 Phase 1）
  LEDGER_ANCHOR: parseAbi([
    "function commitAnchor(uint256 day, bytes32 dayRoot, bytes32 chainedRoot, uint256 entryCount) external",
    "event AnchorCommitted(uint256 indexed day, bytes32 dayRoot, bytes32 chainedRoot, uint256 entryCount)",
  ]),
};
