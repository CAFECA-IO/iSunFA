"use server";

// Info: (20260126 - Luphia) 伺服器端操作：處理部署與鑄造邏輯
import { parseAbi, getAddress, parseEther } from "viem";
import { publicClient } from "@/lib/viem";
import {
  getAdminAccount,
  getAdminWalletClient,
} from "@/lib/wallet/admin_wallet";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { paymentRepo } from "@/repositories/payment.repo";
import { UserOperationJson } from "@/validators";
import { buildTransferUserOp } from "@/lib/utils/user_op_builder";
import { bundlerService } from "@/services/bundler.service";
import { CONTRACT_ADDRESSES, ABIS } from "@/config/contracts";
import { REWARD_AMOUNTS } from "@/constants/price";

// Info: (20260126 - Luphia) 回傳結果型別
type ActionResponse = {
  success: boolean;
  message: string;
  data?: unknown;
};

/**
 * Info: (20260126 - Luphia) 鑄造代幣給指定地址
 * [流程 7-1: 鑄造與發送代幣] 在付款成功且 OEN 扣款完成後 (流程 3-7a 或 4-8)
 * 此函式會被呼叫，透過智能合約將購買的點數 (Credits) 鑄造並發送至使用者的錢包地址 (Wallet Address)
 */
export async function mintToAddress(
  tokenAddress: string,
  userAddress: string,
  amount: number,
): Promise<ActionResponse> {
  try {
    const account = await getAdminAccount();
    const walletClient = await getAdminWalletClient();
    if (!walletClient || !publicClient || !account) {
      throw new Error(
        "Wallet client or public client or account is not initialized",
      );
    }
    const validTo = getAddress(userAddress);
    const amountBigInt = parseEther(amount.toString());

    /**
     * Info: (20260126 - Luphia) 預先檢查：用戶是否有 Identity?
     * 這裡為了簡化，若用戶沒有 Identity 會導致 mint 失敗 (ERC-3643 限制)。
     * 在完整的 DApp 中，這裡應該要檢查並自動幫用戶註冊 Identity。
     * 但基於目前需求，我們假設這是"管理者"操作，我們嘗試直接 mint，若失敗則回報。
     *
     * 亦可在此處實作自動註冊 User Identity 的邏輯 (參考 deploy_and_mint.ts)
     * 但因涉及多個合約地址查詢 (需知道 IdentityRegistry)，這裡暫時僅執行 mint。
     *
     * 若要自動註冊，我們需要知道目前的 IdentityRegistry 地址。
     * 可以透過 Token.identityRegistry() 查詢。
     */
    const tokenAbi = parseAbi([
      "function collateralizedMint(address to, uint256 amount) external payable",
      "function collateralRate() view returns (uint256)",
    ]);

    // Info: (20260412 - Luphia) Calculate required collateral
    const collateralRate = await publicClient.readContract({
      address: getAddress(tokenAddress),
      abi: tokenAbi,
      functionName: "collateralRate",
    });

    const requiredISC = (amountBigInt * collateralRate) / BigInt(10 ** 18);

    // Info: (20260126 - Luphia) 嘗試 Mint
    const tx = await walletClient.writeContract({
      account,
      address: getAddress(tokenAddress),
      abi: tokenAbi,
      functionName: "collateralizedMint",
      args: [validTo, amountBigInt],
      value: requiredISC,
    });

    await publicClient.waitForTransactionReceipt({ hash: tx });

    return { success: true, message: `鑄造交易已確認: ${tx}`, data: { tx } };
  } catch (error) {
    console.error("鑄造失敗:", error);
    return {
      success: false,
      message: `鑄造失敗: ${(error as Error).message}. 請確認接收者已註冊合自身分 (Identity).`,
    };
  }
}

// Info: (20260126 - Luphia) 協助註冊用戶 Identity (如果 mint 失敗通常是因為這個)
export async function registerUser(
  tokenAddress: string,
  userAddress: string,
): Promise<ActionResponse> {
  try {
    const account = await getAdminAccount();
    const walletClient = await getAdminWalletClient();
    if (!walletClient || !publicClient || !account) {
      throw new Error(
        "Wallet client or public client or account is not initialized",
      );
    }
    const validUserAddress = getAddress(userAddress);

    // Info: (20260126 - Luphia) 1. 查詢 KYCRegistry Address
    const tokenAbi = parseAbi([
      "function kycRegistry() view returns (address)",
      "function identityRegistry() view returns (address)",
    ]);

    let registryAddress: `0x${string}`;
    try {
      registryAddress = await publicClient.readContract({
        address: getAddress(tokenAddress),
        abi: tokenAbi,
        functionName: "kycRegistry",
      });
    } catch {
      // Info: (20260413 - Luphia) Fallback mapping if token uses the old string name
      registryAddress = await publicClient.readContract({
        address: getAddress(tokenAddress),
        abi: tokenAbi,
        functionName: "identityRegistry",
      });
    }

    console.log(
      `[RegisterUser] KYCRegistry: ${registryAddress}, checking status for ${validUserAddress}`,
    );

    // Info: (20260129 - Tzuhan) Check if user is already verified via KYCLevel
    const irAbi = parseAbi([
      "function updateKYC(address, uint8) external",
      "function getKYCLevel(address) view returns (uint8)",
    ]);

    const kycLevel = await publicClient.readContract({
      address: registryAddress,
      abi: irAbi,
      functionName: "getKYCLevel",
      args: [validUserAddress],
    });

    let tx;
    if (kycLevel > 0) {
      console.log(
        `[RegisterUser] User ${validUserAddress} is already verified (Level ${kycLevel}).`,
      );
    } else {
      console.log(
        `[RegisterUser] Registering new KYC status for ${validUserAddress}`,
      );
      tx = await walletClient.writeContract({
        address: registryAddress,
        abi: irAbi,
        functionName: "updateKYC",
        args: [validUserAddress, 1], // Info: (20260412 - Luphia) LEVEL_1
      });
      await publicClient.waitForTransactionReceipt({ hash: tx });
      console.log(`[RegisterUser] Registration confirmed: ${tx}`);
    }

    // Info: (20260413 - Luphia) 補發或正常發放註冊獎勵 (防呆機制：補償以前合約壞掉沒領到點數的人)
    const user = await webAuthnRepo.findUserByAddress(validUserAddress);

    if (user) {
      await syncRegistrationRewardIfNeeded(
        user.id,
        validUserAddress,
        tokenAddress as `0x${string}`,
      );
    }

    return {
      success: true,
      message: `用戶已註冊 KYC (${validUserAddress})`,
      data: { tx },
    };
  } catch (error) {
    console.error("RegisterUser failed during step:", (error as Error).message);
    return { success: false, message: (error as Error).message };
  }
}

export async function syncRegistrationRewardIfNeeded(
  userId: string,
  validUserAddress: `0x${string}`,
  tokenAddress: `0x${string}`,
) {
  const existingRewards = await paymentRepo.getOrdersByUserId(
    userId,
    "REGISTRATION_REWARD",
  );

  if (existingRewards.length === 0) {
    mintToAddress(
      tokenAddress,
      validUserAddress,
      REWARD_AMOUNTS.REGISTRATION_REWARD,
    )
      .then(async (res) => {
        if (res.success) {
          await paymentRepo.createOrder({
            userId: userId,
            type: "REGISTRATION_REWARD",
            amount: REWARD_AMOUNTS.REGISTRATION_REWARD,
            status: "COMPLETED",
            challenge: "registration",
            data: {},
            transactionHash: (res.data as { tx: string })?.tx || "",
          });
          console.log(
            `[SyncReward] Successfully logged registration reward for ${validUserAddress}`,
          );
        }
      })
      .catch((err) => {
        console.error(
          `[SyncReward] Failed to async mint tokens for ${validUserAddress}:`,
          err,
        );
      });
  } else {
    // console.log(`[SyncReward] Registration reward already exists for ${validUserAddress}`);
  }
}
// Info: (20260127 - Tzuhan) 強制轉帳
export async function forcedTransfer(
  tokenAddress: string,
  from: string,
  to: string,
  amount: number,
): Promise<ActionResponse> {
  try {
    const account = await getAdminAccount();
    const walletClient = await getAdminWalletClient();
    if (!walletClient || !publicClient || !account) {
      throw new Error(
        "Wallet client or public client or account is not initialized",
      );
    }
    const validFrom = getAddress(from);
    const validTo = getAddress(to);
    const amountBigInt = parseEther(amount.toString());

    const tokenAbi = parseAbi([
      "function forcedTransfer(address, address, uint256) external returns (bool)",
    ]);

    console.log(
      `Executing forcedTransfer: ${validFrom} -> ${validTo} (${amount})`,
    );

    const tx = await walletClient.writeContract({
      address: getAddress(tokenAddress),
      abi: tokenAbi,
      functionName: "forcedTransfer",
      args: [validFrom, validTo, amountBigInt],
    });

    await publicClient.waitForTransactionReceipt({ hash: tx });
    return { success: true, message: `強制轉帳成功: ${tx}`, data: { tx } };
  } catch (error) {
    console.error("強制轉帳失敗:", error);
    // Info: (20260128 - Tzuhan) Error Analysis
    let reason = (error as Error).message;
    if (reason.includes("Identity")) reason = "Identity Invalid or Missing";
    else if (reason.includes("Compliance"))
      reason = "Compliance Check Failed (e.g. Limit exceeded, Blacklisted)";
    else if (reason.includes("Balance")) reason = "Insufficient Balance";

    return { success: false, message: `強制轉帳失敗: ${reason}` };
  }
}

// Info: (20260127 - Tzuhan) 銷毀代幣
export async function burn(
  tokenAddress: string,
  from: string,
  amount: number,
): Promise<ActionResponse> {
  try {
    const account = await getAdminAccount();
    const walletClient = await getAdminWalletClient();
    if (!walletClient || !publicClient || !account) {
      throw new Error(
        "Wallet client or public client or account is not initialized",
      );
    }
    const validFrom = getAddress(from);
    const amountBigInt = parseEther(amount.toString());

    const tokenAbi = parseAbi(["function burn(address, uint256) external"]);

    const tx = await walletClient.writeContract({
      address: getAddress(tokenAddress),
      abi: tokenAbi,
      functionName: "burn",
      args: [validFrom, amountBigInt],
    });

    await publicClient.waitForTransactionReceipt({ hash: tx });
    return { success: true, message: `銷毀交易已確認: ${tx}`, data: { tx } };
  } catch (error) {
    console.error("銷毀失敗:", error);
    return { success: false, message: `銷毀失敗: ${(error as Error).message}` };
  }
}

// Info: (20260127 - Tzuhan) 凍結/解凍代幣
export async function freeze(
  tokenAddress: string,
  target: string,
  amount: number,
): Promise<ActionResponse> {
  return toggleFreeze(tokenAddress, target, amount, true);
}

export async function unfreeze(
  tokenAddress: string,
  target: string,
  amount: number,
): Promise<ActionResponse> {
  return toggleFreeze(tokenAddress, target, amount, false);
}

async function toggleFreeze(
  tokenAddress: string,
  target: string,
  amount: number,
  isFreeze: boolean,
): Promise<ActionResponse> {
  try {
    const account = await getAdminAccount();
    const walletClient = await getAdminWalletClient();
    if (!walletClient || !publicClient || !account) {
      throw new Error(
        "Wallet client or public client or account is not initialized",
      );
    }
    const validTarget = getAddress(target);
    const amountBigInt = parseEther(amount.toString());
    const functionName = isFreeze
      ? "freezePartialTokens"
      : "unfreezePartialTokens";

    const tokenAbi = parseAbi([
      `function ${functionName}(address, uint256) external`,
    ]);

    const tx = await walletClient.writeContract({
      address: getAddress(tokenAddress),
      abi: tokenAbi,
      functionName: functionName,
      args: [validTarget, amountBigInt],
    });

    await publicClient.waitForTransactionReceipt({ hash: tx });
    return {
      success: true,
      message: `${isFreeze ? "凍結" : "解凍"}交易已確認: ${tx}`,
      data: { tx },
    };
  } catch (error) {
    console.error(`${isFreeze ? "凍結" : "解凍"}失敗:`, error);
    return {
      success: false,
      message: `${isFreeze ? "凍結" : "解凍"}失敗: ${(error as Error).message}`,
    };
  }
}

// Info: (20260127 - Tzuhan) 暫停/恢復系統
export async function pause(tokenAddress: string): Promise<ActionResponse> {
  return togglePause(tokenAddress, true);
}

export async function unpause(tokenAddress: string): Promise<ActionResponse> {
  return togglePause(tokenAddress, false);
}

async function togglePause(
  tokenAddress: string,
  isPause: boolean,
): Promise<ActionResponse> {
  try {
    const account = await getAdminAccount();
    const walletClient = await getAdminWalletClient();
    if (!walletClient || !publicClient || !account) {
      throw new Error(
        "Wallet client or public client or account is not initialized",
      );
    }
    const functionName = isPause ? "pause" : "unpause";
    const tokenAbi = parseAbi([`function ${functionName}() external`]);

    const tx = await walletClient.writeContract({
      address: getAddress(tokenAddress),
      abi: tokenAbi,
      functionName: functionName,
      args: [],
    });

    await publicClient.waitForTransactionReceipt({ hash: tx });
    return {
      success: true,
      message: `系統已${isPause ? "暫停" : "恢復"}: ${tx}`,
      data: { tx },
    };
  } catch (error) {
    console.error(`系統${isPause ? "暫停" : "恢復"}失敗:`, error);
    return {
      success: false,
      message: `系統${isPause ? "暫停" : "恢復"}失敗: ${(error as Error).message}`,
    };
  }
}

// Info: (20260130 - Tzuhan) Client Token Transfer Support

/**
 * Info: (20260130 - Tzuhan) Backend prepares the UserOp for the publicClient to sign.
 * This ensures the logic (Gas, Nonce, CallData) is handled securely and consistently on the server.
 */
export async function prepareTransferUserOp(
  sender: string,
  amount: number,
  orderId?: string,
): Promise<
  ActionResponse & { data?: { userOp: UserOperationJson; userOpHash: string } }
> {
  try {
    const validSender = getAddress(sender);
    const validRecipient = CONTRACT_ADDRESSES.SUBSCRIPTION_MANAGER;

    const amountWei = (Number(amount) * 10 ** 18).toString();

    // Info: (20260130 - Tzuhan) 1. Build UserOp
    const userOp = await buildTransferUserOp(
      validSender,
      validRecipient,
      amountWei,
      CONTRACT_ADDRESSES.CREDIT_POINT,
      orderId,
    );

    // Info: (20260130 - Tzuhan) 2. Calculate UserOp Hash using EntryPoint
    const userOpHash = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.ENTRY_POINT,
      abi: ABIS.ENTRY_POINT,
      functionName: "getUserOpHash",
      args: [
        {
          sender: userOp.sender as `0x${string}`,
          nonce: BigInt(userOp.nonce),
          initCode: userOp.initCode as `0x${string}`,
          callData: userOp.callData as `0x${string}`,
          accountGasLimits: userOp.accountGasLimits as `0x${string}`,
          preVerificationGas: BigInt(userOp.preVerificationGas),
          gasFees: userOp.gasFees as `0x${string}`,
          paymasterAndData: userOp.paymasterAndData as `0x${string}`,
          signature: userOp.signature as `0x${string}`,
        },
      ],
    });

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

// Info: (20260130 - Tzuhan) Submits the signed UserOp to the Bundler.
export async function submitSignedUserOp(
  userOp: UserOperationJson,
): Promise<ActionResponse> {
  try {
    const result = await bundlerService.sendUserOp(
      userOp,
      CONTRACT_ADDRESSES.ENTRY_POINT,
    );

    if (result.status === "reverted") {
      return { success: false, message: "Transaction reverted on chain" };
    }

    return {
      success: true,
      message: "Transfer successful",
      data: { tx: result.transactionHash },
    };
  } catch (error) {
    console.error("submitSignedUserOp failed:", error);
    return {
      success: false,
      message: `Transfer failed: ${(error as Error).message}`,
    };
  }
}
