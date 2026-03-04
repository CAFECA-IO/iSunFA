import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { userOperationSchema } from '@/validators';
import { ABIS } from '@/config/contracts';

const RELAYER_PRIVATE_KEY = process.env.ISUNCOIN_PRIVATE_KEY as `0x${string}` | undefined;
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

export class BundlerService {
  public async sendUserOp(userOpJson: unknown, entryPointAddress: string) {
    if (!RELAYER_PRIVATE_KEY || !rpcUrl) {
      throw new Error('Server configuration error: Missing env variables');
    }

    const userOp = userOperationSchema.parse(userOpJson);

    // Info: (20251118 - Tzuhan) 設定 Viem 客戶端連接至 isuncoin_mainnet
    const publicClient = createPublicClient({ transport: http(rpcUrl) });
    const relayerAccount = privateKeyToAccount(RELAYER_PRIVATE_KEY);
    const relayerClient = createWalletClient({
      account: relayerAccount,
      transport: http(rpcUrl),
    });
    /**
     * Info: (20251121 - Tzuhan) [資金流向] Relayer 發送交易「平台墊付」。
     * Relayer 使用自己的私鑰 (RELAYER_PRIVATE_KEY) 發送以太坊交易，
     * 因此區塊鏈收取的 Gas 費是從 Relayer 的餘額中扣除的。
     * ★★★ 關於 Relayer 全額買單 ★★★
     * 如果前端傳來的 UserOp 中 maxFeePerGas 是 0：
     * 1. EntryPoint 不會扣 SCW 的錢 (prefund = 0)。
     * 2. 但 Relayer 發送這筆交易時，仍需支付一般的 Transaction Fee (除非我們是礦工)。
     * 3. 結果：Relayer 支出 Gas，收入 0 (沒有來自 EntryPoint 的退款)。平台成功吸收了成本。
     */
    const ops = [
      {
        sender: userOp.sender as `0x${string}`,
        nonce: userOp.nonce,
        initCode: userOp.initCode as `0x${string}`,
        callData: userOp.callData as `0x${string}`,
        callGasLimit: userOp.callGasLimit,
        verificationGasLimit: userOp.verificationGasLimit,
        preVerificationGas: userOp.preVerificationGas,
        maxFeePerGas: userOp.maxFeePerGas,
        maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
        paymasterAndData: userOp.paymasterAndData as `0x${string}`,
        signature: userOp.signature as `0x${string}`,
      },
    ];

    // Info: (20251118 - Tzuhan) "beneficiary" 是代付 Gas 並收取費用的地址
    const beneficiary = relayerAccount.address;

    // Info: (20251204 - Tzuhan) 模擬並發送交易到 EntryPoint.handleOps
    const { request } = await publicClient.simulateContract({
      account: relayerAccount,
      address: entryPointAddress as `0x${string}`,
      abi: ABIS.ENTRY_POINT,
      functionName: 'handleOps',
      args: [ops, beneficiary],
      chain: publicClient.chain,
    });

    // Info: (20251204 - Tzuhan) 發送交易
    const txHash = await relayerClient.writeContract(request);

    // Info: (20251204 - Tzuhan) 等待交易被打包並回傳結果
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    return {
      transactionHash: receipt.transactionHash,
      status: receipt.status,
    };
  }
}

export const bundlerService = new BundlerService();
