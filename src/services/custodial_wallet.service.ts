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
import { UserOperationJson, userOperationSchema } from "@/validators";

/**
 * Info: (20260809 - Luphia) 託管錢包服務。
 *
 * 只服務「沒有 passkey」的第三方登入使用者：伺服器代管其 P-256 私鑰，
 * 代為部署 SCW 並在需要時代簽 UserOp。
 *
 * 安全邊界（重要）：
 * 1. 這個服務不提供「任意雜湊代簽」的公開端點。呼叫端必須指定 target / value / data，
 *    由本服務自行組出 UserOp 與 userOpHash，避免變成簽章預言機。
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

    const sender = (await publicClient.readContract({
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

  /**
   * Info: (20260810 - Luphia) 驗證一份「已經組好的」UserOp 並算出它的 challenge。
   *
   * 付款流程的 UserOp 本來就是伺服器端用 prepareTransferUserOp 組出來的
   * （target 是 CreditPoint、data 是轉給 MEMBERSHIP_SYSTEM 並附上訂單雜湊），
   * 呼叫端只是要拿到它的 challenge 去換一份託管簽章。
   *
   * 它不是簽章預言機，靠兩道限制：
   * 1. sender 必須等於該使用者自己的 SCW 位址——只能簽自己錢包的操作，
   *    沒辦法叫它替別人的錢包或任意位址簽名。
   * 2. userOpHash 由伺服器向 EntryPoint 重新計算，不接受呼叫端傳入的雜湊，
   *    因此簽章必然對應到實際會上鏈的那份 UserOp。
   */
  public async resolveUserOpChallenge(
    userId: string,
    userOpJson: UserOperationJson,
  ): Promise<string> {
    const { entryPoint } = this.requireContracts();

    const record = await this.keyRepo.findByUserId(userId);
    if (!record) {
      throw new AppError(API_ERRORS.AUTH_CUSTODIAL_KEY_MISSING);
    }

    const expectedSender = (await publicClient.readContract({
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

    if (userOpJson.sender.toLowerCase() !== expectedSender.toLowerCase()) {
      logger.error("Refusing to sign a UserOp for a foreign sender", {
        userId,
        requested: userOpJson.sender,
        expected: expectedSender,
      });
      throw new AppError(API_ERRORS.AUTH_PERMISSION_DENIED);
    }

    const parsed = userOperationSchema.parse(userOpJson);
    const userOpHash = await this.getUserOpHash(entryPoint, {
      sender: parsed.sender as Address,
      nonce: parsed.nonce,
      initCode: parsed.initCode as Hex,
      callData: parsed.callData as Hex,
      callGasLimit: parsed.callGasLimit,
      verificationGasLimit: parsed.verificationGasLimit,
      preVerificationGas: parsed.preVerificationGas,
      maxFeePerGas: parsed.maxFeePerGas,
      maxPriorityFeePerGas: parsed.maxPriorityFeePerGas,
      paymasterAndData: parsed.paymasterAndData as Hex,
      signature: "0x" as Hex,
    });

    /**
     * Info: (20260810 - Luphia) 回傳 base64url 形式的 challenge 而非直接簽章：
     * 簽章統一由 custodial_signing.service 產生，全系統只有一條合成 assertion 的路徑。
     */
    return Buffer.from(userOpHash.slice(2), "hex").toString("base64url");
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
