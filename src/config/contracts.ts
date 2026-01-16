import { Address, parseAbi } from 'viem';

export const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN;
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.isuncoin.com';
// Info: (20251216 - Tzuhan) 從 Ignition 部署檔獲取的地址 (Chain 8017)
// 建議: 若專案設定允許引用 src 外部檔案，可直接 import JSON；否則在此定義常量
export const CONTRACT_ADDRESSES = {
  ENTRY_POINT: (process.env.NEXT_PUBLIC_ENTRY_POINT_ADDRESS ||
    '0xE617D9180B0aC1e0B8B3F2a408B406898BC86148') as Address,
  FACTORY: (process.env.NEXT_PUBLIC_SCW_FACTORY_ADDRESS ||
    '0x86EE60851B6B916528241442BA53697DfEE75897') as Address,
} as const;

export const ABIS = {
  ENTRY_POINT: parseAbi([
    'struct UserOperation { address sender; uint256 nonce; bytes initCode; bytes callData; uint256 callGasLimit; uint256 verificationGasLimit; uint256 preVerificationGas; uint256 maxFeePerGas; uint256 maxPriorityFeePerGas; bytes paymasterAndData; bytes signature; }',
    'function handleOps(UserOperation[] calldata ops, address payable beneficiary)',
    'function getNonce(address sender, uint192 key) external view returns (uint256 nonce)',
    'function getUserOpHash((address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature) userOp) external view returns (bytes32)',
    'function getSenderAddress(bytes calldata initCode) external view returns (address)',
    'error FailedOp(uint256 opIndex, string reason)',
  ]),
  FACTORY: parseAbi([
    'event AccountCreated(address indexed scw, uint256 pubKeyX, uint256 pubKeyY, uint256 salt, string credentialId, string username, string imageUrl)',
    'function getAddress(uint256 pubKeyX, uint256 pubKeyY, uint256 salt) public view returns (address)',
    'function createAccount(uint256 pubKeyX, uint256 pubKeyY, uint256 salt, string credentialId, string username, string imageUrl) external returns (address)',
  ]),
  IDENTITY: parseAbi([
    'function getPlan() external view returns (string)',
    'function getCredits() external view returns (uint256)',
  ]),
};
