import { Address, parseAbi } from "viem";

export const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN;
export const RPC_URL = "http://127.0.0.1:20024";

// Info: (20260124 - Tzuhan) ERC-4337 & RWA System Addresses from latest deployment
export const CONTRACT_ADDRESSES = {
  KYC_REGISTRY: process.env.NEXT_PUBLIC_KYC_REGISTRY_ADDRESS as Address,
  DYNAMIC_MEMBERSHIP_CARD: process.env.NEXT_PUBLIC_DYNAMIC_MEMBERSHIP_CARD_ADDRESS as Address,
  CREDIT_POINT: process.env.NEXT_PUBLIC_CREDIT_POINT_ADDRESS as Address,
  MEMBERSHIP_SYSTEM: process.env.NEXT_PUBLIC_MEMBERSHIP_SYSTEM_ADDRESS as Address,
  SUBSCRIPTION_MANAGER: process.env.NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS as Address,
  SCW_FACTORY: process.env.NEXT_PUBLIC_SCW_FACTORY_ADDRESS as Address,
  ENTRY_POINT: process.env.NEXT_PUBLIC_ENTRY_POINT_ADDRESS as Address,
} as const;

export const ABIS = {
  // Info: (20251230 - Tzuhan) ERC-4337 EntryPoint
  ENTRY_POINT: parseAbi([
    "struct PackedUserOperation { address sender; uint256 nonce; bytes initCode; bytes callData; bytes32 accountGasLimits; uint256 preVerificationGas; bytes32 gasFees; bytes paymasterAndData; bytes signature; }",
    "function handleOps(PackedUserOperation[] calldata ops, address payable beneficiary)",
    "function getNonce(address sender, uint192 key) external view returns (uint256 nonce)",
    "function getUserOpHash(PackedUserOperation userOp) external view returns (bytes32)",
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

  // Info: (20260126 - Tzuhan) RWA Identity Registry (Mapped to KYCRegistry in Enterprise Edition)
  KYC_REGISTRY: parseAbi([
    "function getKYCLevel(address user) external view returns (uint8)",
    "function isFrozen(address user) external view returns (bool)",
    "function updateKYC(address user, uint8 _level) external",
    "function setFreezeStatus(address user, bool _freeze) external",
  ]),

  // Info: (20251230 - Tzuhan) Credit Point Token
  CREDIT_POINT: parseAbi([
    "function mint(address to, uint256 amount) external",
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
};
