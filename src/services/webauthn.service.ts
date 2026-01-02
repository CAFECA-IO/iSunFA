import { promises as fs } from 'fs';
import path from 'path';
import { createHash, randomBytes } from 'crypto';
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
import type { IWebAuthnRepository } from '@/repositories/webauthn.repo';
import { webAuthnRepo } from '@/repositories/webauthn.repo';
import { AppError } from '@/lib/utils/error';
import { ApiCode } from '@/lib/utils/status';
import { extractXYFromSPKI } from '@/lib/auth/fido2_parse';

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
  constructor(private readonly repo: IWebAuthnRepository) { }

  public async generateLoginOptions(): Promise<string> {
    try {
      const termsPath = path.join(process.cwd(), 'documents/terms_of_service.md');
      const privacyPath = path.join(process.cwd(), 'documents/privacy_policy.md');

      const [termsContent, privacyContent] = await Promise.all([
        fs.readFile(termsPath, 'utf8'),
        fs.readFile(privacyPath, 'utf8'),
      ]);

      const signedAt = new Date().toISOString();

      // Info: (20260102 - Luphia) Combine contents and timestamp
      const dataToHash = `${termsContent}${privacyContent}${signedAt}`;

      // Info: (20260102 - Luphia) Generate SHA-256 hash
      const hash = createHash('sha256').update(dataToHash).digest('base64url');

      return hash;
    } catch (error) {
      console.error('Failed to generate challenge from documents:', error);
      throw new AppError(ApiCode.INTERNAL_SERVER_ERROR, 'Failed to generate challenge from documents');
    }
  }

  /**
   * Info: (20251226 - Tzuhan)
   * [Step 2] 驗證登入
   */
  /**
   * Info: (20251231 - Tzuhan) Usernameless Login
   */
  public async loginUsingCredential(
    authenticationData: AuthenticationJSON,
    expectedChallenge: string
  ): Promise<ILoginResult> {
    // 1. Find user by Credential ID
    let user = await this.repo.findUserByCredentialId(authenticationData.id);

    // Info: (20251231 - Tzuhan) Fallback: Sync from Chain if not found in DB
    if (!user) {
      user = await this.syncUserFromChain(authenticationData.id);
    }

    if (!user || !user.pubKeyX || !user.pubKeyY) {
      throw new AppError(ApiCode.NOT_FOUND, 'User not found or credential not registered.');
    }

    // 2. Reconstruct Public Key
    const credentialPublicKey = this.reconstructKeyFromXY(user.pubKeyX, user.pubKeyY);

    const credential: CredentialInfo = {
      id: authenticationData.id,
      publicKey: credentialPublicKey,
      algorithm: 'ES256',
      transports: [],
    };

    // 3. Verify Authentication
    try {
      await verifyAuthentication(authenticationData, credential, expectedChallenge);
    } catch (error) {
      console.error('Login verification failed:', error);
      throw new AppError(ApiCode.UNAUTHORIZED, 'Invalid signature');
    }

    // 4. Issue Token
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

  /**
   * Info: (20251226 - Tzuhan)
   * [Step 2] 驗證登入 (Deprecated/Legacy address-based flow)
   * Keeping for reference or if specific address login is needed.
   */


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

  /**
   * Info: (20251231 - Tzuhan) Register new user
   */
  public async registerUser(
    username: string,
    registrationData: RegistrationJSON,
    expectedChallenge: string
  ): Promise<ILoginResult> {
    // 1. Verify Registration
    const { x, y, credentialID } = await this.parseRegistrationCredential(registrationData, expectedChallenge);

    // 2. Check if Credential already exists
    const existingUser = await this.repo.findUserByCredentialId(credentialID);
    if (existingUser) {
      throw new AppError(ApiCode.CONFLICT, 'Credential already registered. Please login.');
    }

    // 3. Create User (Mock address for now, or need SCW factory logic)
    // Info: (20251231 - Tzuhan) In a real SCW flow, we would deploy the contract here.
    // For this prototype, we'll generate a placeholder address or assume the deployment happens elsewhere.
    // However, the repo requires an address. Let's assume we derive it or generate a mock one.
    // To properly support SCW, this step should call the Factory to deploy.
    // For now, let's throw if we can't deploy, OR implement a simple "create DB user" if that's the goal.
    // BUT the requirement is "register". Let's assume we create a DB record.
    // We'll generate a random address for now to satisfy the constraint, but this should be the SCW address.

    // For the sake of this task (UI refactor), I will simulate user creation.
    // Ideally, this calls bundlerService to deploy.
    // Let's assume we can't fully deploy without a seed.
    // We will generate a mock address to allow the flow to complete.
    const mockAddress = '0x' + randomBytes(20).toString('hex');

    const newUser = await this.repo.upsertUser({
      address: mockAddress,
      pubKeyX: x,
      pubKeyY: y,
      credentialId: credentialID,
      name: username,
      imageUrl: '',
    });

    // 4. Issue Token
    const dewt = await signDeWT(newUser);

    return {
      dewt,
      user: {
        address: newUser.address,
        name: newUser.name,
        role: newUser.role,
      }
    };
  }

  /**
   * Info: (20251231 - Tzuhan) Sync user from chain using Credential ID (for recovery/multi-device)
   * Scans 'AccountCreated' events to find the user associated with this credential.
   */
  private async syncUserFromChain(credentialId: string) {
    console.log(`[Sync] Scanning chain for credential: ${credentialId}`);
    try {
      // Info: (20251231 - Tzuhan) Fetch all logs (expensive in long run, acceptable for prototype)
      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESSES.FACTORY as `0x${string}`,
        event: parseAbiItem(
          'event AccountCreated(address indexed scw, uint256 pubKeyX, uint256 pubKeyY, uint256 salt, string credentialId, string name, string imageUrl)'
        ),
        fromBlock: 'earliest',
      });

      // Filter in memory because credentialId is not indexed
      const log = logs.find((l) => l.args.credentialId === credentialId);

      if (!log) {
        console.log('[Sync] No matching credential found on chain.');
        return null;
      }

      const { scw, pubKeyX, pubKeyY, name, imageUrl } = log.args;

      if (!scw || !pubKeyX || !pubKeyY) return null;

      console.log(`[Sync] Found user ${scw} for credential ${credentialId}. Restoring...`);

      return await this.repo.upsertUser({
        address: scw,
        pubKeyX: pubKeyX.toString(),
        pubKeyY: pubKeyY.toString(),
        credentialId: credentialId,
        name: name || `User ${scw.slice(0, 6)}`,
        imageUrl: imageUrl,
      });
    } catch (error) {
      console.error('[Sync] Chain scan failed:', error);
      return null;
    }
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

  /**
   * Info: (20251226 - Tzuhan) 將 X, Y 座標還原為 P-256 SPKI (DER) 格式
   */
  private reconstructKeyFromXY(xStr: string, yStr: string): string {
    // Info: (20251226 - Tzuhan) P-256 SPKI Header (ASN.1 DER sequence for id-ecPublicKey + prime256v1)
    // Info: (20251226 - Tzuhan) Hex: 3059301306072a8648ce3d020106082a8648ce3d030107034200
    const SPKI_HEADER = Buffer.from('3059301306072a8648ce3d020106082a8648ce3d030107034200', 'hex');

    const toBuffer32 = (numStr: string) => {
      let hex = BigInt(numStr).toString(16);
      if (hex.length % 2 !== 0) hex = '0' + hex;
      const buf = Buffer.from(hex, 'hex');
      const padded = Buffer.alloc(32);
      buf.copy(padded, 32 - buf.length);
      return padded;
    };

    const x = toBuffer32(xStr);
    const y = toBuffer32(yStr);

    // Info: (20251226 - Tzuhan) 0x04 表示 Uncompressed Point
    const uncompressedPoint = Buffer.concat([Buffer.from([0x04]), x, y]);

    // Info: (20251226 - Tzuhan) 組合 Header + Point
    return Buffer.concat([SPKI_HEADER, uncompressedPoint]).toString('base64url');
  }
}

export const webAuthnService = new WebAuthnService(webAuthnRepo);
