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

    /** Info: (20260130 - Tzuhan)
     * 3. Get Nonce
     */
    let nonce = BigInt(0);
    try {
      const entryPointAbi = parseAbi([
        "function getNonce(address sender, uint192 key) external view returns (uint256)",
      ]);
      const randomKey = BigInt(
        Math.floor(Date.now() * Math.random()) % 1000000000,
      );
      nonce = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.ENTRY_POINT,
        abi: entryPointAbi,
        functionName: "getNonce",
        args: [validSender, randomKey],
      });
    } catch (e) {
      console.warn("Failed to fetch nonce, defaulting to 0", e);
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
