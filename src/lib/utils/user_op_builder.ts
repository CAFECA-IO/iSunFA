import { UserOperationJson } from "@/validators";
import { encodeFunctionData, parseAbi, Address, toHex, keccak256, stringToBytes } from "viem";
import { publicClient } from "@/lib/viem_public";
import { CONTRACT_ADDRESSES, ABIS } from "@/config/contracts";

/**
 * Info: (20260128 - Tzuhan)
 * 構建 ERC-20 轉帳的 UserOperation (尚未簽名)
 */
export async function buildTransferUserOp(
    sender: Address,
    to: Address,
    amount: string, // Info: (20260130 - Tzuhan) Parsed 18 decimals string
    tokenAddress: Address = CONTRACT_ADDRESSES.NTD_TOKEN,
    orderId?: string // Info: (20260209 - Tzuhan) Optional Order ID to bind payment
): Promise<UserOperationJson> {

    /** Info: (20260130 - Tzuhan) 
     * 1. Encode Inner Call (Token Transfer)
     * Info: Standard ERC20 Transfer
    */
    const tokenAbi = parseAbi(['function transfer(address to, uint256 amount) external returns (bool)']);
    let executeCallData = encodeFunctionData({
        abi: tokenAbi,
        functionName: 'transfer',
        args: [to, BigInt(amount)],
    });

    // Info: (20260209 - Tzuhan) If orderId is provided, append its hash to the call data
    if (orderId) {
        // Info: (20260209 - Tzuhan) 將 Order ID Hash 附加在交易資料末端。ERC-20 合約會忽略多餘資料，但後端可用此驗證交易與訂單的綁定關係。
        const orderHash = keccak256(stringToBytes(orderId));
        executeCallData = (executeCallData + orderHash.slice(2)) as `0x${string}`;
    }

    /** Info: (20260130 - Tzuhan) 
     * 2. Encode SCW Execute (The actual call data for the EntryPoint)
     * SCW.execute(dest, value, func)
    */
    const scwCallData = encodeFunctionData({
        abi: ABIS.SCW,
        functionName: 'execute',
        args: [tokenAddress, BigInt(0), executeCallData]
    });

    /** Info: (20260130 - Tzuhan) 
     * 3. Get Nonce
     * EntryPoint.getNonce(sender, 0)
     * Note: If nonce is not sequential, this might fail, but for simple use case it's fine.
    */
    let nonce = BigInt(0);
    try {
        const entryPointAbi = parseAbi(['function getNonce(address sender, uint192 key) external view returns (uint256)']);
        nonce = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.ENTRY_POINT,
            abi: entryPointAbi,
            functionName: 'getNonce',
            args: [sender, BigInt(0)]
        });
    } catch (e) {
        console.warn('Failed to fetch nonce, defaulting to 0', e);
    }

    /** Info: (20260130 - Tzuhan) 
     * 4. Gas Estimation (Simplified)
     * In a real bundler, we might use eth_estimateUserOperationGas
     * Here we use safe defaults for a token transfer.
     * Bumped from 200_000 to 500_000 to support complex ERC-3643 Token transfer logic.
    */
    const callGasLimit = BigInt(500_000); // Info: (20260304 - Tzuhan) Token transfer + ERC-3643 compliance overhead
    const verificationGasLimit = BigInt(1_000_000); // Info: (20260130 - Tzuhan) Signature verification (P-256 is heavy, bumping significantly)
    const preVerificationGas = BigInt(300_000); // Info: (20260130 - Tzuhan) Bumped for safety with large signatures
    const maxFeePerGas = BigInt(0);
    const maxPriorityFeePerGas = BigInt(0);

    return {
        sender: sender,
        nonce: toHex(nonce),
        initCode: "0x",
        callData: scwCallData,
        callGasLimit: toHex(callGasLimit),
        verificationGasLimit: toHex(verificationGasLimit),
        preVerificationGas: toHex(preVerificationGas),
        maxFeePerGas: toHex(maxFeePerGas),
        maxPriorityFeePerGas: toHex(maxPriorityFeePerGas),
        paymasterAndData: "0x",
        signature: "0x"
    };
}
