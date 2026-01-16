import { publicClient } from '@/lib/viem';
import { parseAbiItem } from 'viem';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import type {
  RegistrationJSON,
  AuthenticationJSON,
  CredentialInfo,
} from '@passwordless-id/webauthn/dist/esm/types';
import { verifyAuthentication, verifyRegistration } from '@/lib/auth/fido2_server';
import { signDeWT } from '@/lib/auth/dewt';
import { IWebAuthnRepository, webAuthnRepo } from '@/repositories/webauthn.repo';
import { AppError } from '@/lib/utils/error';
import { ApiCode } from '@/lib/utils/status';
import { extractXYFromSPKI, reconstructKeyFromXY } from '@/lib/auth/crypto_utils';
import { randomBytes } from 'crypto';
import { generateChallengeToken, verifyChallengeToken } from '@/lib/auth/challenge_token';

interface ILoginResult {
  dewt: string;
  user: {
    address: string;
    name: string | null;
    role: string;
  };
}

interface IParsedPublicKey {
  x: string;
  y: string;
  credentialID: string;
}

class WebAuthnService {
  constructor(private readonly repo: IWebAuthnRepository) {}

  public async generateLoginOptions(address: string): Promise<string> {
    const user = await this.ensureUserSynced(address);

    if (!user) {
      throw new AppError(ApiCode.NOT_FOUND, 'User not found on chain. Please register first.');
    }

    const challenge = randomBytes(32).toString('base64url');
    await this.repo.updateChallenge(address, challenge);

    return challenge;
  }

  /**
   * Info: (20251226 - Tzuhan)
   * [Step 2] 驗證登入
   */
  public async loginWithAddress(
    address: string,
    authenticationData: AuthenticationJSON
  ): Promise<ILoginResult> {
    const user = await this.repo.findUserByAddress(address);

    if (!user || !user.pubKeyX || !user.pubKeyY || !user.currentChallenge) {
      throw new AppError(ApiCode.NOT_FOUND, 'User data incomplete. Please retry login flow.');
    }

    // Info: (20251226 - Tzuhan) 將 DB 中的 (X, Y) 還原為驗證庫需要的 SPKI Key 字串
    const credentialPublicKey = reconstructKeyFromXY(user.pubKeyX, user.pubKeyY);

    // Info: (20251223 - Tzuhan) 建構符合 CredentialInfo 定義的物件
    // Info: (20251223 - Tzuhan) P-256 對應的演算法名稱通常是 'ES256'
    const credential: CredentialInfo = {
      id: authenticationData.id,
      publicKey: credentialPublicKey,
      algorithm: 'ES256',
      transports: [], // Info: (20251223 - Tzuhan) 資料庫未存 transports，給空陣列以符合型別
    };

    try {
      await verifyAuthentication(authenticationData, credential, user.currentChallenge);
    } catch (error) {
      console.error('Login verification failed:', error);
      throw new AppError(ApiCode.UNAUTHORIZED, 'Invalid signature');
    }

    // Info: (20251223 - Tzuhan) 驗證通過，簽發 Token
    const dewt = await signDeWT(user);
    await this.repo.updateChallenge(address, '');

    return {
      dewt,
      user: {
        address: user.address,
        name: user.name,
        role: user.role,
      },
    };
  }

  public async parseRegistrationCredential(
    registrationData: RegistrationJSON,
    expectedChallenge: string
  ): Promise<IParsedPublicKey> {
    const verification = await verifyRegistration(registrationData, expectedChallenge);
    const { x, y } = extractXYFromSPKI(verification.credential.publicKey);
    return {
      x: x.toString(),
      y: y.toString(),
      credentialID: verification.credential.id,
    };
  }

  private async ensureUserSynced(address: string) {
    const user = await this.repo.findUserByAddress(address);
    if (user) return user;

    console.log(`[Sync] Fetching ${address} from chain...`);
    try {
      // Info: (20251226 - Tzuhan) Update: 更新 event 定義以包含 name, imageUrl
      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESSES.FACTORY as `0x${string}`,
        event: parseAbiItem(
          'event AccountCreated(address indexed scw, uint256 pubKeyX, uint256 pubKeyY, uint256 salt, string credentialId,string name, string imageUrl)'
        ),
        args: { scw: address as `0x${string}` },
        fromBlock: 'earliest',
      });

      if (logs.length === 0) return null;

      // Info: (20251226 - Tzuhan) Update: 解構取得 name
      const { pubKeyX, pubKeyY, credentialId, name, imageUrl } = logs[0].args;

      if (!pubKeyX || !pubKeyY) return null;

      return await this.repo.upsertUser({
        address: address,
        pubKeyX: pubKeyX.toString(),
        pubKeyY: pubKeyY.toString(),
        credentialId: credentialId,
        name: name || `User ${address.slice(0, 6)}`, // Info: (20251226 - Tzuhan) 使用鏈上抓到的 name
        imageUrl: imageUrl,
      });
    } catch (error) {
      console.error('[Sync] Chain fetch failed:', error);
      return null;
    }
  }

  // Info: (20260105 - Tzuhan) 產生無狀態 Challenge (給 Discoverable Login 用)
  public async generateStatelessLoginOptions() {
    return await generateChallengeToken();
  }

  /**
   * Info: (20260105 - Tzuhan) 救災模式
   * 從鏈上掃描事件並恢復用戶
   * 當 DB 清空時，這是唯一能找回使用者的方法
   */
  private async recoverUserByCredentialId(credentialId: string) {
    try {
      console.log('[Recovery] Scanning blockchain for AccountCreated events...');

      /**
       * Info: (20260105 - Tzuhan) 1. 抓取所有 AccountCreated 事件
       * 注意：因為 credentialId 沒有 indexed，我們必須抓回來在記憶體中過濾
       * 在生產環境如果事件量大，這會變慢，但在目前階段是可行的
       */
      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESSES.FACTORY as `0x${string}`,
        event: parseAbiItem(
          'event AccountCreated(address indexed scw, uint256 pubKeyX, uint256 pubKeyY, uint256 salt, string credentialId, string name, string imageUrl)'
        ),
        fromBlock: 'earliest',
      });

      // Info: (20260105 - Tzuhan) 2. 尋找符合的 credentialId
      const matchLog = logs.find((log) => log.args.credentialId === credentialId);

      if (!matchLog) {
        console.log('[Recovery] No matching credential ID found on chain.');
        return null;
      }

      const { scw, pubKeyX, pubKeyY, name, imageUrl } = matchLog.args;
      if (!scw || !pubKeyX || !pubKeyY) return null;

      console.log(`[Recovery] Found user ${scw} on chain. Restoring...`);

      // Info: (20260105 - Tzuhan) 3. 恢復用戶到 DB
      const user = await this.repo.upsertUser({
        address: scw,
        pubKeyX: pubKeyX.toString(),
        pubKeyY: pubKeyY.toString(),
        credentialId: credentialId,
        name: name || `User ${scw.slice(0, 6)}`,
        imageUrl: imageUrl,
      });

      return user;
    } catch (error) {
      console.error('[Recovery] Failed to recover user:', error);
      return null;
    }
  }

  // Info: (20260105 - Tzuhan) [核心修改] 處理無地址登入 (Discoverable Login)
  public async loginWithCredential(
    challengeToken: string,
    authenticationData: AuthenticationJSON
  ): Promise<ILoginResult> {
    // Info: (20260105 - Tzuhan) 1. 驗證 Challenge
    const expectedChallenge = await verifyChallengeToken(challengeToken);

    // Info: (20260105 - Tzuhan) 2. 透過 Credential ID 找人
    let user = await this.repo.findUserByCredentialId(authenticationData.id);

    // Info: (20260105 - Tzuhan) 3. 若 DB 找不到 (可能是 DB 被清空)，嘗試從鏈上救援
    if (!user) {
      console.log(
        `[Login] User not found in DB, attempting to recover from chain using Credential ID: ${authenticationData.id}`
      );
      user = await this.recoverUserByCredentialId(authenticationData.id);
    }

    if (!user || !user.pubKeyX || !user.pubKeyY) {
      throw new AppError(ApiCode.NOT_FOUND, 'User not found or passkey not registered');
    }

    // Info: (20260105 - Tzuhan) 4. 還原公鑰並驗證
    const credentialPublicKey = reconstructKeyFromXY(user.pubKeyX, user.pubKeyY);
    const credential: CredentialInfo = {
      id: authenticationData.id,
      publicKey: credentialPublicKey,
      algorithm: 'ES256',
      transports: [],
    };

    try {
      await verifyAuthentication(authenticationData, credential, expectedChallenge);
    } catch (error) {
      console.error('Login verification failed:', error);
      throw new AppError(ApiCode.UNAUTHORIZED, 'Invalid signature');
    }

    // Info: (20260105 - Tzuhan) 5. 簽發 DeWT
    const dewt = await signDeWT(user);

    return {
      dewt,
      user: {
        address: user.address,
        name: user.name,
        role: user.role,
      },
    };
  }
}

export const webAuthnService = new WebAuthnService(webAuthnRepo);
