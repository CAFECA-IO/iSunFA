'use server';

// Info: (20260126 - Luphia) 伺服器端操作：處理部署與鑄造邏輯
import { parseAbi, getAddress } from 'viem';
import { account, publicClient, walletClient } from '@/lib/viem';
import IR_ARTIFACT from '@erc3643org/erc-3643/artifacts/contracts/registry/implementation/IdentityRegistry.sol/IdentityRegistry.json';
import IRS_ARTIFACT from '@erc3643org/erc-3643/artifacts/contracts/registry/implementation/IdentityRegistryStorage.sol/IdentityRegistryStorage.json';
import CTR_ARTIFACT from '@erc3643org/erc-3643/artifacts/contracts/registry/implementation/ClaimTopicsRegistry.sol/ClaimTopicsRegistry.json';
import TIR_ARTIFACT from '@erc3643org/erc-3643/artifacts/contracts/registry/implementation/TrustedIssuersRegistry.sol/TrustedIssuersRegistry.json';
import COMPLIANCE_ARTIFACT from '@erc3643org/erc-3643/artifacts/contracts/compliance/modular/ModularCompliance.sol/ModularCompliance.json';
import IDENTITY_ARTIFACT from '@erc3643org/erc-3643/artifacts/@onchain-id/solidity/contracts/Identity.sol/Identity.json';
import TOKEN_ARTIFACT from '@erc3643org/erc-3643/artifacts/contracts/token/Token.sol/Token.json';
import { UserOperationJson } from '@/validators';
import { buildTransferUserOp } from '@/lib/utils/user_op_builder';
import { bundlerService } from '@/services/bundler.service';
import { CONTRACT_ADDRESSES, ABIS } from '@/config/contracts';


// Info: (20260126 - Luphia) 回傳結果型別
type ActionResponse = {
  success: boolean;
  message: string;
  data?: unknown;
};

// Info: (20260126 - Luphia) 部署整個 TWD 系統
export async function deploySystem(name: string = 'New Taiwan Dollar', symbol: string = 'TWD', decimals: number = 18): Promise<ActionResponse> {
  try {
    if (!walletClient || !publicClient || !account) {
      throw new Error('Wallet client or public client or account is not initialized');
    }
    console.log('--- 開始由 Web 介面觸發部署 ---');

    // Info: (20260126 - Luphia) 1. 部署 ClaimTopicsRegistry
    const ctrHash = await walletClient.deployContract({
      abi: CTR_ARTIFACT.abi,
      bytecode: CTR_ARTIFACT.bytecode as `0x${string}`,
    });
    const ctrReceipt = await publicClient.waitForTransactionReceipt({ hash: ctrHash });
    const CTR_ADDRESS = ctrReceipt.contractAddress!;
    await walletClient.writeContract({ address: CTR_ADDRESS, abi: CTR_ARTIFACT.abi, functionName: 'init', args: [] });

    // Info: (20260126 - Luphia) 2. 部署 TrustedIssuersRegistry
    const tirHash = await walletClient.deployContract({
      abi: TIR_ARTIFACT.abi,
      bytecode: TIR_ARTIFACT.bytecode as `0x${string}`,
    });
    const tirReceipt = await publicClient.waitForTransactionReceipt({ hash: tirHash });
    const TIR_ADDRESS = tirReceipt.contractAddress!;
    await walletClient.writeContract({ address: TIR_ADDRESS, abi: TIR_ARTIFACT.abi, functionName: 'init', args: [] });

    // Info: (20260126 - Luphia) 3. 部署 IdentityRegistryStorage
    const irsHash = await walletClient.deployContract({
      abi: IRS_ARTIFACT.abi,
      bytecode: IRS_ARTIFACT.bytecode as `0x${string}`,
    });
    const irsReceipt = await publicClient.waitForTransactionReceipt({ hash: irsHash });
    const IRS_ADDRESS = irsReceipt.contractAddress!;
    await walletClient.writeContract({ address: IRS_ADDRESS, abi: IRS_ARTIFACT.abi, functionName: 'init', args: [] });

    // Info: (20260126 - Luphia) 4. 部署 IdentityRegistry
    const irHash = await walletClient.deployContract({
      abi: IR_ARTIFACT.abi,
      bytecode: IR_ARTIFACT.bytecode as `0x${string}`,
    });
    const irReceipt = await publicClient.waitForTransactionReceipt({ hash: irHash });
    const IR_ADDRESS = irReceipt.contractAddress!;
    await walletClient.writeContract({
      address: IR_ADDRESS,
      abi: IR_ARTIFACT.abi,
      functionName: 'init',
      args: [TIR_ADDRESS, CTR_ADDRESS, IRS_ADDRESS] // Info: (20260126 - Luphia) TrustedIssuers, ClaimTopics, Storage
    });

    // Info: (20260126 - Luphia) 將部署者設為 Registry 的 Agent，才有權限 registerIdentity
    await walletClient.writeContract({
      address: IR_ADDRESS,
      abi: IR_ARTIFACT.abi,
      functionName: 'addAgent',
      args: [account.address]
    });

    // Info: (20260126 - Luphia) 5. 部署 ModularCompliance
    const compHash = await walletClient.deployContract({
      abi: COMPLIANCE_ARTIFACT.abi,
      bytecode: COMPLIANCE_ARTIFACT.bytecode as `0x${string}`,
    });
    const compReceipt = await publicClient.waitForTransactionReceipt({ hash: compHash });
    const COMP_ADDRESS = compReceipt.contractAddress!;
    await walletClient.writeContract({ address: COMP_ADDRESS, abi: COMPLIANCE_ARTIFACT.abi, functionName: 'init', args: [] });

    // Info: (20260126 - Luphia) 6. 部署 Issuer Identity
    const ioiHash = await walletClient.deployContract({
      abi: IDENTITY_ARTIFACT.abi,
      bytecode: IDENTITY_ARTIFACT.bytecode as `0x${string}`,
      args: [account.address, false]
    });
    const ioiReceipt = await publicClient.waitForTransactionReceipt({ hash: ioiHash });
    const IOI_ADDRESS = ioiReceipt.contractAddress!;

    // Info: (20260126 - Luphia) 7. 部署 TWD Token
    const tokenHash = await walletClient.deployContract({
      abi: TOKEN_ARTIFACT.abi,
      bytecode: TOKEN_ARTIFACT.bytecode as `0x${string}`,
      args: []
    });
    const tokenReceipt = await publicClient.waitForTransactionReceipt({ hash: tokenHash });
    const TOKEN_ADDRESS = tokenReceipt.contractAddress!;

    const TOKEN_ABI = parseAbi([
      'function init(address, address, string, string, uint8, address) external',
      'function addAgent(address) external',
      'function batchMint(address[] _toList, uint256[] _amounts) external'
    ]);

    // Info: (20260126 - Luphia) 初始化 Token
    await walletClient.writeContract({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      functionName: 'init',
      args: [IR_ADDRESS, COMP_ADDRESS, name, symbol, decimals, IOI_ADDRESS]
    });

    // Info: (20260126 - Luphia) 連結
    const IRS_ABI = parseAbi(['function bindIdentityRegistry(address) external']);
    await walletClient.writeContract({ address: IRS_ADDRESS, abi: IRS_ABI, functionName: 'bindIdentityRegistry', args: [IR_ADDRESS] });

    const COMPLIANCE_ABI = parseAbi(['function bindToken(address) external']);
    await walletClient.writeContract({ address: COMP_ADDRESS, abi: COMPLIANCE_ABI, functionName: 'bindToken', args: [TOKEN_ADDRESS] });

    await walletClient.writeContract({ address: TOKEN_ADDRESS, abi: TOKEN_ABI, functionName: 'addAgent', args: [account.address] });

    // Info: (20260126 - Luphia) 需將此新地址回傳給前端更新
    return {
      success: true,
      message: '系統部署成功',
      data: {
        token: TOKEN_ADDRESS,
        registry: IR_ADDRESS,
        compliance: COMP_ADDRESS,
        claimTopicsRegistry: CTR_ADDRESS,
        trustedIssuersRegistry: TIR_ADDRESS,
        identityRegistryStorage: IRS_ADDRESS,
        issuerIdentity: IOI_ADDRESS
      }
    };
  } catch (error) {
    console.error('部署失敗:', error);
    return { success: false, message: `部署失敗: ${(error as Error).message}` };
  }
}

// Info: (20260126 - Luphia) 鑄造代幣給指定地址
export async function mintToAddress(tokenAddress: string, to: string, amount: number, memo?: string): Promise<ActionResponse> {
  try {
    if (!walletClient || !publicClient || !account) {
      throw new Error('Wallet client or public client or account is not initialized');
    }
    const validTo = getAddress(to);
    const amountBigInt = BigInt(amount) * BigInt(10) ** BigInt(18);

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
      'function identityRegistry() view returns (address)',
      'function batchMint(address[], uint256[]) external',
    ]);

    // Info: (20260126 - Luphia) 嘗試 Mint
    let data;
    const { encodeFunctionData, toHex } = await import('viem');
    data = encodeFunctionData({
      abi: tokenAbi,
      functionName: 'batchMint',
      args: [[validTo], [amountBigInt]]
    });

    if (memo) {
      // Append the memo to the calldata. EVM ignores extraneous calldata.
      const memoHex = toHex(memo);
      data = `${data}${memoHex.replace('0x', '')}` as `0x${string}`;
    }

    const tx = await walletClient.sendTransaction({
      account,
      to: getAddress(tokenAddress),
      data,
    });

    await publicClient.waitForTransactionReceipt({ hash: tx });

    return { success: true, message: `鑄造交易已確認: ${tx}`, data: { tx } };

  } catch (error) {
    console.error('鑄造失敗:', error);
    return { success: false, message: `鑄造失敗: ${(error as Error).message}. 請確認接收者已註冊合自身分 (Identity).` };
  }
}

// Info: (20260126 - Luphia) 協助註冊用戶 Identity (如果 mint 失敗通常是因為這個)
export async function registerUser(tokenAddress: string, userAddress: string): Promise<ActionResponse> {
  try {
    if (!walletClient || !publicClient || !account) {
      throw new Error('Wallet client or public client or account is not initialized');
    }
    const validUserAddress = getAddress(userAddress);

    // Info: (20260126 - Luphia) 1. 查詢 Registry
    const tokenAbi = parseAbi(['function identityRegistry() view returns (address)']);
    const registryAddress = await publicClient.readContract({
      address: getAddress(tokenAddress),
      abi: tokenAbi,
      functionName: 'identityRegistry'
    });

    console.log(`[RegisterUser] Registry: ${registryAddress}, deploying identity for ${validUserAddress}`);

    // Info: (20260126 - Luphia) 2. 部署 User Identity
    const uoiHash = await walletClient.deployContract({
      abi: IDENTITY_ARTIFACT.abi,
      bytecode: IDENTITY_ARTIFACT.bytecode as `0x${string}`,
      args: [validUserAddress, false]
    });
    const uoiReceipt = await publicClient.waitForTransactionReceipt({ hash: uoiHash });
    const userIdentityAddress = uoiReceipt.contractAddress;

    if (!userIdentityAddress) {
      throw new Error('Failed to deploy Identity contract (no address returned)');
    }
    console.log(`[RegisterUser] Identity Deployed at ${userIdentityAddress}`);

    // Info: (20260129 - Tzuhan) Check if user is already verified
    const irAbi = parseAbi([
      'function registerIdentity(address, address, uint16) external',
      'function updateIdentity(address, address) external',
      'function isVerified(address) view returns (bool)',
      'function identity(address) view returns (address)'
    ]);

    const isVerified = await publicClient.readContract({
      address: registryAddress,
      abi: irAbi,
      functionName: 'isVerified',
      args: [validUserAddress]
    });

    let tx;
    if (isVerified) {
      console.log(`[RegisterUser] User ${validUserAddress} is already verified. Updating identity found.`);
      tx = await walletClient.writeContract({
        address: registryAddress,
        abi: irAbi,
        functionName: 'updateIdentity',
        args: [validUserAddress, userIdentityAddress]
      });
    } else {
      console.log(`[RegisterUser] Registering new identity for ${validUserAddress}`);
      tx = await walletClient.writeContract({
        address: registryAddress,
        abi: irAbi,
        functionName: 'registerIdentity',
        args: [validUserAddress, userIdentityAddress, 158] // Info: (20260126 - Luphia) 158 TW
      });
    }

    await publicClient.waitForTransactionReceipt({ hash: tx });
    console.log(`[RegisterUser] Registration/Update confirmed: ${tx}`);

    return { success: true, message: `用戶已註冊 Identity (${userIdentityAddress})`, data: { tx } };
  } catch (error) {
    console.error('RegisterUser failed during step:', (error as Error).message);
    return { success: false, message: (error as Error).message };
  }
}

// Info: (20260127 - Tzuhan) 強制轉帳
export async function forcedTransfer(tokenAddress: string, from: string, to: string, amount: number): Promise<ActionResponse> {
  try {
    if (!walletClient || !publicClient || !account) {
      throw new Error('Wallet client or public client or account is not initialized');
    }
    const validFrom = getAddress(from);
    const validTo = getAddress(to);
    const amountBigInt = BigInt(Math.floor(amount * 10 ** 18)); // Ensure integer

    const tokenAbi = parseAbi([
      'function forcedTransfer(address, address, uint256) external returns (bool)',
    ]);

    console.log(`Executing forcedTransfer: ${validFrom} -> ${validTo} (${amount})`);

    const tx = await walletClient.writeContract({
      address: getAddress(tokenAddress),
      abi: tokenAbi,
      functionName: 'forcedTransfer',
      args: [validFrom, validTo, amountBigInt]
    });

    await publicClient.waitForTransactionReceipt({ hash: tx });
    return { success: true, message: `強制轉帳成功: ${tx}`, data: { tx } };
  } catch (error) {
    console.error('強制轉帳失敗:', error);
    // Info: (20260128 - Tzuhan) Error Analysis
    let reason = (error as Error).message;
    if (reason.includes('Identity')) reason = 'Identity Invalid or Missing';
    else if (reason.includes('Compliance')) reason = 'Compliance Check Failed (e.g. Limit exceeded, Blacklisted)';
    else if (reason.includes('Balance')) reason = 'Insufficient Balance';

    return { success: false, message: `強制轉帳失敗: ${reason}` };
  }
}

// Info: (20260127 - Tzuhan) 銷毀代幣
export async function burn(tokenAddress: string, from: string, amount: number): Promise<ActionResponse> {
  try {
    if (!walletClient || !publicClient || !account) {
      throw new Error('Wallet client or public client or account is not initialized');
    }
    const validFrom = getAddress(from);
    const amountBigInt = BigInt(amount) * BigInt(10) ** BigInt(18);

    const tokenAbi = parseAbi([
      'function burn(address, uint256) external',
    ]);

    const tx = await walletClient.writeContract({
      address: getAddress(tokenAddress),
      abi: tokenAbi,
      functionName: 'burn',
      args: [validFrom, amountBigInt]
    });

    await publicClient.waitForTransactionReceipt({ hash: tx });
    return { success: true, message: `銷毀交易已確認: ${tx}`, data: { tx } };
  } catch (error) {
    console.error('銷毀失敗:', error);
    return { success: false, message: `銷毀失敗: ${(error as Error).message}` };
  }
}

// Info: (20260127 - Tzuhan) 凍結/解凍代幣
export async function freeze(tokenAddress: string, target: string, amount: number): Promise<ActionResponse> {
  return toggleFreeze(tokenAddress, target, amount, true);
}

export async function unfreeze(tokenAddress: string, target: string, amount: number): Promise<ActionResponse> {
  return toggleFreeze(tokenAddress, target, amount, false);
}

async function toggleFreeze(tokenAddress: string, target: string, amount: number, isFreeze: boolean): Promise<ActionResponse> {
  try {
    if (!walletClient || !publicClient || !account) {
      throw new Error('Wallet client or public client or account is not initialized');
    }
    const validTarget = getAddress(target);
    const amountBigInt = BigInt(amount) * BigInt(10) ** BigInt(18);
    const functionName = isFreeze ? 'freezePartialTokens' : 'unfreezePartialTokens';

    const tokenAbi = parseAbi([
      `function ${functionName}(address, uint256) external`,
    ]);

    const tx = await walletClient.writeContract({
      address: getAddress(tokenAddress),
      abi: tokenAbi,
      functionName: functionName,
      args: [validTarget, amountBigInt]
    });

    await publicClient.waitForTransactionReceipt({ hash: tx });
    return { success: true, message: `${isFreeze ? '凍結' : '解凍'}交易已確認: ${tx}`, data: { tx } };
  } catch (error) {
    console.error(`${isFreeze ? '凍結' : '解凍'}失敗:`, error);
    return { success: false, message: `${isFreeze ? '凍結' : '解凍'}失敗: ${(error as Error).message}` };
  }
}

// Info: (20260127 - Tzuhan) 暫停/恢復系統
export async function pause(tokenAddress: string): Promise<ActionResponse> {
  return togglePause(tokenAddress, true);
}

export async function unpause(tokenAddress: string): Promise<ActionResponse> {
  return togglePause(tokenAddress, false);
}

async function togglePause(tokenAddress: string, isPause: boolean): Promise<ActionResponse> {
  try {
    if (!walletClient || !publicClient || !account) {
      throw new Error('Wallet client or public client or account is not initialized');
    }
    const functionName = isPause ? 'pause' : 'unpause';
    const tokenAbi = parseAbi([
      `function ${functionName}() external`,
    ]);

    const tx = await walletClient.writeContract({
      address: getAddress(tokenAddress),
      abi: tokenAbi,
      functionName: functionName,
      args: []
    });

    await publicClient.waitForTransactionReceipt({ hash: tx });
    return { success: true, message: `系統已${isPause ? '暫停' : '恢復'}: ${tx}`, data: { tx } };
  } catch (error) {
    console.error(`系統${isPause ? '暫停' : '恢復'}失敗:`, error);
    return { success: false, message: `系統${isPause ? '暫停' : '恢復'}失敗: ${(error as Error).message}` };
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
  orderId?: string
): Promise<ActionResponse & { data?: { userOp: UserOperationJson, userOpHash: string } }> {
  try {
    const validSender = getAddress(sender);
    const validRecipient = CONTRACT_ADDRESSES.ISUNCOIN;

    const amountWei = (Number(amount) * 10 ** 18).toString();

    // Info: (20260130 - Tzuhan) 1. Build UserOp
    const userOp = await buildTransferUserOp(
      validSender,
      validRecipient,
      amountWei,
      CONTRACT_ADDRESSES.NTD_TOKEN,
      orderId
    );

    // Info: (20260130 - Tzuhan) 2. Calculate UserOp Hash using EntryPoint
    const userOpHash = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.ENTRY_POINT,
      abi: ABIS.ENTRY_POINT,
      functionName: 'getUserOpHash',
      args: [{
        sender: userOp.sender as `0x${string}`,
        nonce: BigInt(userOp.nonce),
        initCode: userOp.initCode as `0x${string}`,
        callData: userOp.callData as `0x${string}`,
        callGasLimit: BigInt(userOp.callGasLimit),
        verificationGasLimit: BigInt(userOp.verificationGasLimit),
        preVerificationGas: BigInt(userOp.preVerificationGas),
        maxFeePerGas: BigInt(userOp.maxFeePerGas),
        maxPriorityFeePerGas: BigInt(userOp.maxPriorityFeePerGas),
        paymasterAndData: userOp.paymasterAndData as `0x${string}`,
        signature: userOp.signature as `0x${string}`,
      }]
    });

    return {
      success: true,
      message: 'UserOp prepared',
      data: {
        userOp,
        userOpHash
      }
    };
  } catch (error) {
    console.error('prepareTransferUserOp failed:', error);
    return { success: false, message: `Failed to prepare transfer: ${(error as Error).message}` };
  }
}

/**
 * Info: (20260130 - Tzuhan) Submits the signed UserOp to the Bundler.
 */
export async function submitSignedUserOp(
  userOp: UserOperationJson
): Promise<ActionResponse> {
  try {
    const result = await bundlerService.sendUserOp(userOp, CONTRACT_ADDRESSES.ENTRY_POINT);

    if (result.status === 'reverted') {
      return { success: false, message: 'Transaction reverted on chain' };
    }

    return {
      success: true,
      message: 'Transfer successful',
      data: { tx: result.transactionHash }
    };
  } catch (error) {
    console.error('submitSignedUserOp failed:', error);
    return { success: false, message: `Transfer failed: ${(error as Error).message}` };
  }
}
