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
    // This allows verification that the payment is bound to a specific order
    if (orderId) {
        const orderHash = keccak256(stringToBytes(orderId));
        // Append without changing the function selector or arguments logic for the inner call?
        // Actually, we can't easily append to `executeCallData` because it's encoded for `transfer`.
        // However, we can append it to the `scwCallData` or just rely on the fact that we are signing the UserOp which *contains* this data?
        // Wait, simply adding it to the UserOp structure isn't standard unless we put it in `paymasterAndData` or similar which might affect gas.
        // A better way for simple binding is to encode it into the `transfer` call if the token supports it (ERC-1363), but here it's standard ERC-20.
        // Alternatively, we can append it to the `callData` of the `execute` function if the `execute` function allows extra data or we ignore it.
        // But `SCW.execute` usually takes (dest, value, func).

        // Strategy: We will confuse the decoder if we just append.
        // IMPORTANT: The standard way to "attach" data to a transaction without affecting execution logic 
        // is often to send it as part of the `callData` but strictly, `execute` might not support variable length arguments at the end if strict.

        // Let's look at `SCW` ABI. It usually is `execute(address to, uint256 value, bytes data)`.
        // If we change `executeCallData` (the `data` param), we change what is executed on the Token contract.
        // Token.transfer(to, amount) -> checks 64 bytes of args. If we give more, it usually ignores the trailing bytes in Solidity!
        // So appending data to `executeCallData` is the way to go.

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
     * Here we use safe defaults for a token transfer
    */
    const callGasLimit = BigInt(200_000); // Info: (20260130 - Tzuhan) Token transfer + overhead
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
