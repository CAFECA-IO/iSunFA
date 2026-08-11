import { UserOperationJson } from "@/validators";
import {
  encodeFunctionData,
  parseAbi,
  toHex,
  keccak256,
  stringToBytes,
  getAddress,
  parseEther,
  encodeAbiParameters,
  parseAbiParameters,
} from "viem";
import { publicClient, isuncoin } from "@/lib/viem_public";
import { CONTRACT_ADDRESSES, ABIS } from "@/config/contracts";

// Info: (20260811 - Luphia) ERC-4337 的 nonce 是 (key << 64) | seq，key 佔 uint192
const UINT192_MASK = (1n << 192n) - 1n;

/**
 * Info: (20260811 - Luphia) 由 orderId 決定性推導 nonce key，取代原本的隨機 key。
 *
 * ── 為什麼這是一道安全防線，不只是整理 ──
 * ERC-4337 v0.6 的 UserOperation 沒有 validUntil / validAfter，`paymasterAndData` 也是空的，
 * 因此一份簽出來的 UserOp **沒有任何時間邊界**：它一直有效，直到它佔的那個 nonce 槽被用掉。
 *
 * 原本每次都用隨機 key（`Date.now() * Math.random()`），而隨機 key 幾乎必然沒被用過，
 * `getNonce` 回傳 seq 0。於是同一張訂單的每一份簽章各自佔一個獨立的槽——
 * 它們互不作廢、也不過期。N 份簽章就是 N 筆各自可獨立動用的永久授權。
 *
 * 對託管帳號來說這特別要緊：偷到一枚 DeWT 的人可以批次索取簽章，而登出、撤銷 DeWT、
 * 訂單被標記為已付都無法讓已簽出的那些失效——鏈上從不查我們的資料庫。
 *
 * 改成由 orderId 推導之後，同一張訂單的所有簽章共用同一個槽：第一份上鏈就消耗掉它，
 * 其餘**永久失效**。「N 筆可動用的授權」因此收斂成 1 筆，順帶也擋掉同一張訂單被重複付款。
 *
 * 不同訂單得到不同 key，所以併發付款仍不會互相卡住——那正是當初改用隨機 key 想解決的問題，
 * 這個做法同時滿足兩邊。
 *
 * 沒有 orderId 時退回 key 0（標準的循序 nonce 空間），不再用隨機值：
 * 決定性的行為才有辦法推理，隨機只是把問題藏起來。
 */
export function deriveNonceKey(orderId?: string): bigint {
  if (!orderId) return 0n;
  return BigInt(keccak256(stringToBytes(orderId))) & UINT192_MASK;
}

// Info: (20260419 - Agent) Merged to provide a single, pure client-side UserOp builder
export async function prepareTransferUserOp(
  sender: string,
  amount: number,
  orderId?: string,
): Promise<{
  success: boolean;
  message: string;
  data?: { userOp: UserOperationJson; userOpHash: string };
}> {
  try {
    const validSender = getAddress(sender);
    const amountBigInt = parseEther(amount.toString());

    /** Info: (20260130 - Tzuhan)
     * 1. Encode Inner Call (Token Transfer)
     * Info: Standard ERC20 Transfer
     */
    const tokenAbi = parseAbi([
      "function transfer(address to, uint256 amount) external returns (bool)",
    ]);
    let executeCallData = encodeFunctionData({
      abi: tokenAbi,
      functionName: "transfer",
      args: [CONTRACT_ADDRESSES.MEMBERSHIP_SYSTEM, amountBigInt],
    });

    // Info: (20260209 - Tzuhan) 如果有 orderId，附加 Hash 在後方做對帳標記
    if (orderId) {
      const orderHash = keccak256(stringToBytes(orderId));
      executeCallData = (executeCallData + orderHash.slice(2)) as `0x${string}`;
    }

    /** Info: (20260130 - Tzuhan)
     * 2. Encode SCW Execute (The actual call data for the EntryPoint)
     */
    const scwCallData = encodeFunctionData({
      abi: ABIS.SCW,
      functionName: "execute",
      args: [CONTRACT_ADDRESSES.CREDIT_POINT, BigInt(0), executeCallData],
    });

    /**
     * Info: (20260130 - Tzuhan) 3. Get Nonce
     *
     * Info: (20260811 - Luphia) key 由 orderId 決定性推導（見 deriveNonceKey）。
     *
     * getNonce 回傳的是已打包好的完整 nonce（`(key << 64) | seq`），可直接放進 UserOp。
     *
     * 讀取失敗時退回 `key << 64`（即該 key 的 seq 0）而不是 0：
     * 退回 0 會把這筆交易丟進 key 0 的循序空間，與其他交易互搶同一個槽，
     * 而那個槽的 seq 很可能早就不是 0 了，結果是簽出一份必然被 EntryPoint 拒絕的 UserOp。
     */
    const nonceKey = deriveNonceKey(orderId);
    let nonce = nonceKey << 64n;
    try {
      const entryPointAbi = parseAbi([
        "function getNonce(address sender, uint192 key) external view returns (uint256)",
      ]);
      nonce = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.ENTRY_POINT,
        abi: entryPointAbi,
        functionName: "getNonce",
        args: [validSender, nonceKey],
      });
    } catch (e) {
      console.warn("Failed to fetch nonce, defaulting to key sequence 0", e);
    }

    /** Info: (20260130 - Tzuhan)
     * 4. Gas Estimation (Simplified)
     */
    const callGasLimit = BigInt(500_000);
    const verificationGasLimit = BigInt(1_000_000);
    const preVerificationGas = BigInt(300_000);
    const maxFeePerGas = BigInt(0);
    const maxPriorityFeePerGas = BigInt(0);

    const userOp: UserOperationJson = {
      sender: validSender,
      nonce: toHex(nonce),
      initCode: "0x",
      callData: scwCallData,
      callGasLimit: toHex(callGasLimit),
      verificationGasLimit: toHex(verificationGasLimit),
      preVerificationGas: toHex(preVerificationGas),
      maxFeePerGas: toHex(maxFeePerGas),
      maxPriorityFeePerGas: toHex(maxPriorityFeePerGas),
      paymasterAndData: "0x",
      signature: "0x",
    };

    // Info: (20260130 - Tzuhan) 5. Calculate UserOp Hash locally instead of RPC call
    const packed = encodeAbiParameters(
      parseAbiParameters(
        "address, uint256, bytes32, bytes32, uint256, uint256, uint256, uint256, uint256, bytes32",
      ),
      [
        userOp.sender as `0x${string}`,
        BigInt(userOp.nonce),
        keccak256(userOp.initCode as `0x${string}`),
        keccak256(userOp.callData as `0x${string}`),
        BigInt(userOp.callGasLimit),
        BigInt(userOp.verificationGasLimit),
        BigInt(userOp.preVerificationGas),
        BigInt(userOp.maxFeePerGas),
        BigInt(userOp.maxPriorityFeePerGas),
        keccak256(userOp.paymasterAndData as `0x${string}`),
      ],
    );

    const hash = keccak256(packed);
    const userOpHash = keccak256(
      encodeAbiParameters(parseAbiParameters("bytes32, address, uint256"), [
        hash,
        CONTRACT_ADDRESSES.ENTRY_POINT,
        BigInt(isuncoin.id),
      ]),
    );

    return {
      success: true,
      message: "UserOp prepared",
      data: {
        userOp,
        userOpHash: userOpHash as string,
      },
    };
  } catch (error) {
    console.error("prepareTransferUserOp failed:", error);
    return {
      success: false,
      message: `Failed to prepare transfer: ${(error as Error).message}`,
    };
  }
}
