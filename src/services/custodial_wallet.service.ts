import { randomUUID } from "crypto";
import { encodeFunctionData, stringToHex, type Address, type Hex } from "viem";
import { publicClient } from "@/lib/viem";
import { ABIS, CONTRACT_ADDRESSES } from "@/config/contracts";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { CUSTODIAL_CREDENTIAL_PREFIX } from "@/constants/auth_provider";
import {
  encodeAssertion,
  generateCustodialKeyPair,
  signUserOpHash,
} from "@/lib/auth/custodial_signer";
import { openSecret, sealSecret, VaultPurpose } from "@/lib/auth/key_vault";
import {
  custodialKeyRepo,
  ICustodialKeyRepository,
} from "@/repositories/custodial_key.repo";
import { bundlerService, BundlerService } from "@/services/bundler.service";
import { paymentRepo } from "@/repositories/payment.repo";
import { ORDER_STATUS } from "@/constants/status";
import { prepareTransferUserOp } from "@/lib/utils/user_op_builder";
import { hexToBase64Url } from "@/lib/auth/crypto_utils";
import { UserOperationJson } from "@/validators";

/**
 * Info: (20260809 - Luphia) 託管錢包服務。
 *
 * 只服務「沒有 passkey」的第三方登入使用者：伺服器代管其 P-256 私鑰，
 * 代為部署 SCW 並在需要時代簽 UserOp。
 *
 * 安全邊界（重要）：
 * 1. 這個服務不提供「任意雜湊代簽」的公開端點。呼叫端只能指名要做什麼
 *    （執行哪一筆呼叫、付哪一張訂單），UserOp 與 userOpHash 一律由本服務自行組出，
 *    避免變成簽章預言機。任何「把組好的 UserOp 送進來代簽」的介面都不要再加回去——
 *    sender 檢查只證明是誰的錢包，證明不了那筆交易要做什麼（見 buildOrderPaymentUserOp）。
 * 2. 明文私鑰只在單次呼叫的記憶體中出現，不寫檔、不入 log。
 * 3. 使用者日後補綁 passkey 後應改用非託管路徑，並廢除此金鑰。
 */

// Info: (20260809 - Luphia) 與前端 registration.service 對齊的部署 gas 參數
const DEPLOY_GAS = {
  callGasLimit: 500_000n,
  verificationGasLimit: 3_500_000n,
  preVerificationGas: 100_000n,
} as const;

// Info: (20260809 - Luphia) 已部署帳戶執行單筆交易的 gas 參數；驗證不含部署故可較低
const EXECUTE_GAS = {
  callGasLimit: 500_000n,
  verificationGasLimit: 1_000_000n,
  preVerificationGas: 100_000n,
} as const;

// Info: (20260809 - Luphia) 平台代付 gas，maxFeePerGas 為 0 讓 EntryPoint 不向 SCW 預扣款
const ZERO_FEE = {
  maxFeePerGas: 0n,
  maxPriorityFeePerGas: 0n,
} as const;

const DEPLOY_SALT = 0n;

export interface IProvisionedWallet {
  address: string;
  credentialId: string;
  pubKeyX: string;
  pubKeyY: string;
  privateKeyPem: string;
  transactionHash?: string;
}

export interface ICustodialCallRequest {
  target: Address;
  value: bigint;
  data: Hex;
}

function toHex(value: bigint): string {
  return `0x${value.toString(16)}`;
}

export class CustodialWalletService {
  constructor(
    private readonly keyRepo: ICustodialKeyRepository,
    private readonly bundler: BundlerService,
  ) {}

  private requireContracts(): { factory: Address; entryPoint: Address } {
    const factory = CONTRACT_ADDRESSES.SCW_FACTORY;
    const entryPoint = CONTRACT_ADDRESSES.ENTRY_POINT;

    // Info: (20260809 - Luphia) Fail Fast：合約位址未設定時直接凍結，不讓半成品帳號進 DB
    if (!factory || !entryPoint) {
      throw new AppError(API_ERRORS.IS_CONFIG_MISSING);
    }
    return { factory, entryPoint };
  }

  private async getUserOpHash(
    entryPoint: Address,
    userOp: {
      sender: Address;
      nonce: bigint;
      initCode: Hex;
      callData: Hex;
      callGasLimit: bigint;
      verificationGasLimit: bigint;
      preVerificationGas: bigint;
      maxFeePerGas: bigint;
      maxPriorityFeePerGas: bigint;
      paymasterAndData: Hex;
      signature: Hex;
    },
  ): Promise<Hex> {
    return publicClient.readContract({
      address: entryPoint,
      abi: ABIS.ENTRY_POINT,
      functionName: "getUserOpHash",
      args: [userOp],
    });
  }

  /**
   * Info: (20260809 - Luphia) 為新的第三方登入使用者產生金鑰並部署 SCW。
   * 回傳的 privateKeyPem 由呼叫端立刻交給 key_vault 封裝，不得外流到 API 回應。
   */
  public async provisionWallet(params: {
    displayName: string;
    imageUrl: string;
  }): Promise<IProvisionedWallet> {
    const { factory, entryPoint } = this.requireContracts();

    const keyPair = generateCustodialKeyPair();
    // Info: (20260809 - Luphia) 以固定前綴 + UUID 保證與真實 passkey credential 不會碰撞
    const credentialId = `${CUSTODIAL_CREDENTIAL_PREFIX}${randomUUID()}`;
    const credentialIdHex = stringToHex(credentialId);
    const pubKeyX = BigInt(keyPair.pubKeyX);
    const pubKeyY = BigInt(keyPair.pubKeyY);

    const address = await publicClient.readContract({
      address: factory,
      abi: ABIS.SCW_FACTORY,
      functionName: "getAddress",
      args: [credentialIdHex, pubKeyX, pubKeyY, DEPLOY_SALT],
    });

    const factoryCallData = encodeFunctionData({
      abi: ABIS.SCW_FACTORY,
      functionName: "createAccount",
      args: [
        credentialIdHex,
        pubKeyX,
        pubKeyY,
        DEPLOY_SALT,
        params.displayName,
        params.imageUrl,
      ],
    });

    const partialUserOp = {
      sender: address,
      nonce: 0n,
      initCode: `${factory}${factoryCallData.slice(2)}` as Hex,
      callData: "0x" as Hex,
      ...DEPLOY_GAS,
      ...ZERO_FEE,
      paymasterAndData: "0x" as Hex,
      signature: "0x" as Hex,
    };

    const userOpHash = await this.getUserOpHash(entryPoint, partialUserOp);
    const signature = encodeAssertion(
      signUserOpHash(keyPair.privateKeyPem, userOpHash),
    );

    const result = await this.bundler.sendUserOp(
      this.toJson(partialUserOp, signature),
      entryPoint,
    );

    logger.info("Custodial SCW deployed", {
      address,
      transactionHash: result.transactionHash,
    });

    return {
      address,
      credentialId,
      pubKeyX: keyPair.pubKeyX,
      pubKeyY: keyPair.pubKeyY,
      privateKeyPem: keyPair.privateKeyPem,
      transactionHash: result.transactionHash,
    };
  }

  /**
   * Info: (20260809 - Luphia) 代託管使用者執行一筆鏈上呼叫（SCW.execute）。
   * 供既有的付款 / 點數流程在偵測到使用者為託管身分時改走伺服器端簽章。
   */
  public async executeCall(
    userId: string,
    request: ICustodialCallRequest,
  ): Promise<{ transactionHash?: string }> {
    const { entryPoint } = this.requireContracts();

    const record = await this.keyRepo.findByUserId(userId);
    if (!record) {
      throw new AppError(API_ERRORS.AUTH_CUSTODIAL_KEY_MISSING);
    }

    const sender = await this.deriveSender(record);

    const nonce = await publicClient.readContract({
      address: entryPoint,
      abi: ABIS.ENTRY_POINT,
      functionName: "getNonce",
      args: [sender, 0n],
    });

    const partialUserOp = {
      sender,
      nonce,
      initCode: "0x" as Hex,
      callData: encodeFunctionData({
        abi: ABIS.SCW,
        functionName: "execute",
        args: [request.target, request.value, request.data],
      }),
      ...EXECUTE_GAS,
      ...ZERO_FEE,
      paymasterAndData: "0x" as Hex,
      signature: "0x" as Hex,
    };

    const userOpHash = await this.getUserOpHash(entryPoint, partialUserOp);

    // Info: (20260809 - Luphia) 明文私鑰的生命週期僅限這幾行
    const privateKeyPem = openSecret(
      {
        ciphertext: record.encryptedPrivateKey,
        iv: record.iv,
        authTag: record.authTag,
        keyVersion: record.keyVersion,
      },
      VaultPurpose.CUSTODIAL_KEY,
    );
    const signature = encodeAssertion(
      signUserOpHash(privateKeyPem, userOpHash),
    );

    return this.bundler.sendUserOp(
      this.toJson(partialUserOp, signature),
      entryPoint,
    );
  }

  // Info: (20260811 - Luphia) 以託管金鑰紀錄推導該使用者的 SCW 位址（CREATE2，決定性）
  private async deriveSender(record: {
    credentialId: string;
    pubKeyX: string;
    pubKeyY: string;
  }): Promise<Address> {
    return (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.SCW_FACTORY,
      abi: ABIS.SCW_FACTORY,
      functionName: "getAddress",
      args: [
        stringToHex(record.credentialId),
        BigInt(record.pubKeyX),
        BigInt(record.pubKeyY),
        DEPLOY_SALT,
      ],
    })) as Address;
  }

  /**
   * Info: (20260811 - Luphia) 由伺服器自行組出「付這張訂單」的 UserOp 並回傳它的 challenge。
   *
   * ── 為什麼不是由前端把組好的 UserOp 送回來 ──
   * 前一版接受呼叫端傳入的 UserOp，只比對 sender 就代簽，其餘欄位（callData、nonce、
   * gas、fee、paymasterAndData）原封交給 EntryPoint 算雜湊。sender 是「哪個錢包」，
   * callData 才是「做什麼」——驗了 who 沒驗 what。拿到一枚 DeWT 的人可以送
   * `callData = execute(CREDIT_POINT, 0, transfer(攻擊者, 全部餘額))`，通過 sender 檢查後
   * 取得一份合法簽章，直接丟給 bundler，完全不需要再經過本站任何端點；
   * 對 nonce = N, N+1 … 各要一份，登出與撤銷 DeWT 都無法讓那些簽章失效。
   *
   * 在 passkey 模型下「照收到的 UserOp 算雜湊」是安全的：授權閘門是使用者的手指。
   * 託管模型把閘門換成伺服器的 session 檢查，同一段邏輯就從安全變成致命。
   *
   * 因此呼叫端現在只能指名一張訂單，內容一律由伺服器決定：金額取自訂單本身
   * （不是前端說了算）、收款方固定是 MEMBERSHIP_SYSTEM、nonce 與 gas 由組裝函式產生。
   * 前端拿回 assertion 與**伺服器組的那份 UserOp**，兩者必然對應。
   */
  public async buildOrderPaymentUserOp(
    userId: string,
    orderId: string,
  ): Promise<{ userOp: UserOperationJson; challenge: string }> {
    this.requireContracts();

    const record = await this.keyRepo.findByUserId(userId);
    if (!record) {
      throw new AppError(API_ERRORS.AUTH_CUSTODIAL_KEY_MISSING);
    }

    // Info: (20260811 - Luphia) 訂單必須屬於這位使用者且仍未付款，否則不簽
    const order = await paymentRepo.getOrderByIdAndUserId(orderId, userId);
    if (!order) {
      throw new AppError(API_ERRORS.NF_ORDER);
    }
    if (order.status !== ORDER_STATUS.PENDING) {
      throw new AppError(API_ERRORS.VL_INVALID_ORDER_STATUS);
    }

    /**
     * Info: (20260811 - Luphia) 金額取自訂單紀錄。
     * 分析類訂單以負數記錄扣款（見 order.service），這裡取絕對值換算成轉帳金額。
     */
    const amount = Math.abs(Number(order.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError(API_ERRORS.VL_INVALID_ORDER_STATUS);
    }

    const sender = await this.deriveSender(record);
    const prepared = await prepareTransferUserOp(sender, amount, orderId);
    if (!prepared.success || !prepared.data) {
      logger.error("Failed to build custodial payment UserOp", {
        userId,
        orderId,
        message: prepared.message,
      });
      throw new AppError(API_ERRORS.IS_UNKNOWN);
    }

    /**
     * Info: (20260811 - Luphia) 回傳 base64url 形式的 challenge 而非直接簽章：
     * 簽章統一由 custodial_signing.service 產生，全系統只有一條合成 assertion 的路徑。
     */
    return {
      userOp: prepared.data.userOp,
      challenge: hexToBase64Url(prepared.data.userOpHash),
    };
  }

  // Info: (20260809 - Luphia) BundlerService 只吃 hex 字串形式的 UserOp（userOperationSchema 會轉回 BigInt）
  private toJson(
    userOp: {
      sender: Address;
      nonce: bigint;
      initCode: Hex;
      callData: Hex;
      callGasLimit: bigint;
      verificationGasLimit: bigint;
      preVerificationGas: bigint;
      maxFeePerGas: bigint;
      maxPriorityFeePerGas: bigint;
      paymasterAndData: Hex;
    },
    signature: Hex,
  ): UserOperationJson {
    return {
      sender: userOp.sender,
      nonce: toHex(userOp.nonce),
      initCode: userOp.initCode,
      callData: userOp.callData,
      callGasLimit: toHex(userOp.callGasLimit),
      verificationGasLimit: toHex(userOp.verificationGasLimit),
      preVerificationGas: toHex(userOp.preVerificationGas),
      maxFeePerGas: toHex(userOp.maxFeePerGas),
      maxPriorityFeePerGas: toHex(userOp.maxPriorityFeePerGas),
      paymasterAndData: userOp.paymasterAndData,
      signature,
    };
  }

  // Info: (20260809 - Luphia) 供 oauth.service 在建立使用者的同一個交易內寫入金鑰密文
  public sealPrivateKey(privateKeyPem: string) {
    return sealSecret(privateKeyPem, VaultPurpose.CUSTODIAL_KEY);
  }
}

export const custodialWalletService = new CustodialWalletService(
  custodialKeyRepo,
  bundlerService,
);
