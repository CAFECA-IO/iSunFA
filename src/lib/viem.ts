import { RPC_URL } from '@/config/contracts';
import { createPublicClient, http } from 'viem';

// Info: (20251216 - Tzuhan) 統一的 Public Client 實例
// 這裡預設使用環境變數中的 RPC_URL，若無則 fallback 到 hardhat 預設
export const publicClient = createPublicClient({ transport: http(RPC_URL) });
