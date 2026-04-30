import { parseAbiParameters, encodeAbiParameters, type Hex, stringToHex, encodeFunctionData } from "viem";
import { p256 } from "@noble/curves/p256";
import { sha256 } from "@noble/hashes/sha256";
import crypto from "crypto";
import { publicClient } from "@/lib/viem";
import { CONTRACT_ADDRESSES, ABIS } from "@/config/contracts";
import { bundlerService } from "@/services/bundler.service";
import { webAuthnService } from "@/services/webauthn.service";
import { getWebAuthnSignatureStruct, hexToBase64Url } from "@/lib/auth/crypto_utils";
import type { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";

export class RegisterBotService {
  /**
   * Info: (20260429 - Luphia)
   * 根據輸入的 seed 生成 P-256 私鑰，自動佈署 SCW 並且取得 DeWT 登入。
   * 適用於 AI Agent 等需要自動完成 FIDO2 註冊與登入的無頭客戶端場景。
   */
  public async registerAndLogin(seed: string, username: string): Promise<{ dewt: string; scwAddress: string; privKeyHex: string; credentialID: string; pubKeyX: string; pubKeyY: string }> {
    // Info: (20260429 - Luphia) 1. 從 seed 推導出 P-256 私鑰與 Credential ID
    const privKeyBytes = sha256(new TextEncoder().encode(seed));
    const pubKeyBytes = p256.getPublicKey(privKeyBytes, false); // false for uncompressed point (0x04)

    // Info: (20260429 - Luphia) 取出 X 和 Y 座標
    const xHex = Buffer.from(pubKeyBytes.slice(1, 33)).toString("hex");
    const yHex = Buffer.from(pubKeyBytes.slice(33, 65)).toString("hex");
    const pubKeyX = BigInt("0x" + xHex);
    const pubKeyY = BigInt("0x" + yHex);

    // Info: (20260429 - Luphia) 生成決定性的 credentialID (必須符合 Base64URL 格式以相容 WebAuthn)
    const rawIdBytes = crypto.createHash("sha256").update(seed).digest();
    const credentialID = Buffer.from(rawIdBytes).toString("base64url");
    const credentialIdHex = stringToHex(credentialID);
    const salt = BigInt(0);

    if (!CONTRACT_ADDRESSES.SCW_FACTORY || !CONTRACT_ADDRESSES.ENTRY_POINT) {
      throw new Error("Contract Addresses not configured.");
    }

    // Info: (20260429 - Luphia) 2. 預測 SCW 錢包地址
    const scwAddress = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.SCW_FACTORY,
      abi: ABIS.SCW_FACTORY,
      functionName: "getAddress",
      args: [credentialIdHex, pubKeyX, pubKeyY, salt],
    })) as string;

    // Info: (20260429 - Luphia) 檢查是否已在鏈上佈署
    const code = await publicClient.getBytecode({ address: scwAddress as `0x${string}` });
    const isDeployed = code && code !== "0x";

    if (!isDeployed) {
      console.log(`[BotService] Deploying SCW for bot '${username}' at ${scwAddress}...`);

      const factoryCallData = encodeFunctionData({
        abi: ABIS.SCW_FACTORY,
        functionName: "createAccount",
        args: [credentialIdHex, pubKeyX, pubKeyY, salt, username, "default_bot_avatar_url"],
      });
      const initCode = `${CONTRACT_ADDRESSES.SCW_FACTORY}${factoryCallData.slice(2)}` as Hex;

      const partialUserOp = {
        sender: scwAddress as Hex,
        nonce: BigInt(0),
        initCode,
        callData: "0x" as Hex,
        callGasLimit: 500_000n,
        verificationGasLimit: 3_500_000n,
        preVerificationGas: 100_000n,
        maxFeePerGas: 0n,
        maxPriorityFeePerGas: 0n,
        paymasterAndData: "0x" as Hex,
        signature: "0x" as Hex,
      };

      // Info: (20260429 - Luphia) 取得 userOpHash
      const userOpHashHex = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.ENTRY_POINT,
        abi: ABIS.ENTRY_POINT,
        functionName: "getUserOpHash",
        args: [partialUserOp],
      }) as Hex;

      // Info: (20260429 - Luphia) 模擬 FIDO2 簽名 UserOpHash
      const challengeBase64 = hexToBase64Url(userOpHashHex);
      const authJson = this.createMockAuthenticationJSON(challengeBase64, credentialID, privKeyBytes);

      // Info: (20260429 - Luphia) 編碼 WebAuthn 簽名讓合約 (fido2_account.sol) 驗證
      const struct = getWebAuthnSignatureStruct(authJson, pubKeyX, pubKeyY);
      const encodedSignature = encodeAbiParameters(
        parseAbiParameters("bytes, bytes, uint256, uint256, uint256, uint256"),
        [
          struct.authenticatorData,
          struct.clientDataJSON,
          struct.challengeLocation,
          struct.responseTypeLocation,
          struct.r,
          struct.s,
        ],
      );

      const finalUserOp = {
        ...partialUserOp,
        nonce: `0x${partialUserOp.nonce.toString(16)}`,
        callGasLimit: `0x${partialUserOp.callGasLimit.toString(16)}`,
        verificationGasLimit: `0x${partialUserOp.verificationGasLimit.toString(16)}`,
        preVerificationGas: `0x${partialUserOp.preVerificationGas.toString(16)}`,
        maxFeePerGas: `0x${partialUserOp.maxFeePerGas.toString(16)}`,
        maxPriorityFeePerGas: `0x${partialUserOp.maxPriorityFeePerGas.toString(16)}`,
        signature: encodedSignature,
      };

      // Info: (20260429 - Luphia) 送交 Bundler 佈署
      const result = await bundlerService.sendUserOpAsync(finalUserOp, CONTRACT_ADDRESSES.ENTRY_POINT);
      console.log(`[BotService] SCW Deployment submitted! Tx: ${result.transactionHash}. Waiting for chain confirmation...`);

      // Info: (20260429 - Luphia) 嘗試強制本地節點出塊 (Hardhat/Anvil)
      try {
        await (publicClient as unknown as { request: (args: { method: string }) => Promise<void> }).request({ method: "evm_mine" });
      } catch {
        // Info: (20260429 - Luphia) 忽略生產環境不支援此 RPC 方法的錯誤
      }

      // Info: (20260429 - Luphia) 輪詢等待合約佈署成功
      let isConfirmed = false;
      for (let i = 0; i < 30; i++) {
        const code = await publicClient.getBytecode({ address: scwAddress as `0x${string}` });
        if (code && code !== "0x") {
          console.log(`[BotService] SCW is now confirmed on chain!`);
          isConfirmed = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      if (!isConfirmed) {
        throw new Error("Bot deployment failed: Chain confirmation timed out.");
      }

      // Info: (20260429 - Luphia) 等待鏈上同步與確保 Database 同步
      await webAuthnService.ensureUserSynced(scwAddress);
    } else {
      console.log(`[BotService] SCW ${scwAddress} already deployed.`);
      // Info: (20260429 - Luphia) 若已佈署但可能尚未同步 DB
      await webAuthnService.ensureUserSynced(scwAddress);
    }

    // Info: (20260429 - Luphia) 4. 登入取得 DeWT
    console.log(`[BotService] Logging in...`);
    const challengeTokenAndData = await webAuthnService.generateStatelessLoginOptions();
    const loginChallenge = challengeTokenAndData.challenge; // Info: (20260429 - Luphia) verifyLogin expects token, but we need challenge to sign

    const loginAuthJson = this.createMockAuthenticationJSON(loginChallenge, credentialID, privKeyBytes);
    const loginResult = await webAuthnService.loginWithCredential(challengeTokenAndData.token, loginAuthJson);

    console.log(`[BotService] Login successful!`);

    return {
      dewt: loginResult.dewt,
      scwAddress,
      privKeyHex: Buffer.from(privKeyBytes).toString("hex"),
      credentialID,
      pubKeyX: pubKeyX.toString(),
      pubKeyY: pubKeyY.toString(),
    };
  }

  /**
   * Info: (20260429 - Luphia)
   * 在後端利用 P-256 私鑰模擬 FIDO2 裝置的簽章過程，
   * 產出符合 WebAuthn 標準的 AuthenticationJSON 結構。
   */
  public createMockAuthenticationJSON(challengeBase64: string, credentialID: string, privKeyBytes: Uint8Array): AuthenticationJSON {
    // Info: (20260429 - Luphia) 1. 偽造 clientDataJSON
    const clientData = {
      type: "webauthn.get",
      challenge: challengeBase64,
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      crossOrigin: false,
    };
    const clientDataJSONStr = JSON.stringify(clientData);
    const clientDataJSONBase64 = Buffer.from(clientDataJSONStr).toString("base64url");

    // Info: (20260429 - Luphia) 2. 偽造 authenticatorData (37 bytes: 32 bytes rpIdHash + 1 byte flags + 4 bytes signCount)
    const originUrl = new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
    const rpIdHash = crypto.createHash("sha256").update(originUrl.hostname).digest();
    const flags = Buffer.from([0x01]); // Info: (20260429 - Luphia) User Present (UP) bit set
    const signCount = Buffer.from([0x00, 0x00, 0x00, 0x00]); // Info: (20260429 - Luphia) 簽章計數
    const authenticatorDataBuf = Buffer.concat([rpIdHash, flags, signCount]);
    const authenticatorDataBase64 = authenticatorDataBuf.toString("base64url");

    // Info: (20260429 - Luphia) 3. 準備待簽名訊息 Hash: SHA256(authenticatorData || SHA256(clientDataJSON))
    const clientDataHash = crypto.createHash("sha256").update(clientDataJSONStr).digest();
    const messageBuf = Buffer.concat([authenticatorDataBuf, clientDataHash]);
    const messageHash = crypto.createHash("sha256").update(messageBuf).digest();

    // Info: (20260429 - Luphia) 4. 進行 P-256 簽名
    const signatureObj = p256.sign(messageHash, privKeyBytes);
    const signatureDerHex = signatureObj.toDERRawBytes();
    const signatureBase64 = Buffer.from(signatureDerHex).toString("base64url");

    // Info: (20260429 - Luphia) 5. 回傳符合 WebAuthn 規格的物件
    return {
      id: credentialID,
      rawId: credentialID,
      type: "public-key",
      clientExtensionResults: {},
      response: {
        authenticatorData: authenticatorDataBase64,
        clientDataJSON: clientDataJSONBase64,
        signature: signatureBase64,
        userHandle: undefined,
      },
    };
  }
}

export const registerBotService = new RegisterBotService();
