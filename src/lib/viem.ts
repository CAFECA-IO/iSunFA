import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { isuncoin } from '@/lib/viem_public';
import 'dotenv';


export * from '@/lib/viem_public';

// Info: (20260121 - Tzuhan) --- Server Side Config ---
const RELAYER_PRIVATE_KEY = process.env.ISUNCOIN_PRIVATE_KEY as `0x${string}`;

if (!RELAYER_PRIVATE_KEY) {
    console.warn('⚠️ 未設定 ISUNCOIN_PRIVATE_KEY，Relayer 功能將無法使用');
}

// Info: (20260121 - Tzuhan) --- 2. 伺服器端帳戶 (Relayer) ---
export const account = RELAYER_PRIVATE_KEY ? privateKeyToAccount(RELAYER_PRIVATE_KEY) : null;

// Info: (20260121 - Tzuhan) 伺服器端 Wallet Client (用於 Relayer 交易)
// 注意：不要在 Client Component 使用此變數，因為它依賴私鑰
export const walletClient =
    RELAYER_PRIVATE_KEY && account
        ? createWalletClient({ account, chain: isuncoin, transport: http() })
        : null;
