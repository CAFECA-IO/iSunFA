import { NextRequest } from 'next/server';
import { AuthenticationJSON } from '@passwordless-id/webauthn/dist/esm/types';
import { decodeFunctionData, keccak256, stringToBytes, parseAbi, decodeEventLog } from 'viem';

import { getIdentityFromDeWT } from '@/lib/auth/dewt';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
import { analysisService } from '@/services/analysis.service';
import { webAuthnService } from '@/services/webauthn.service';
import { AppError } from '@/lib/utils/error';
import { analysisRepo } from '@/repositories/analysis.repo';
import { orderGenerator } from '@/lib/order/order.generator';
import { getPeriodDateRange } from '@/lib/analysis/period';
import { publicClient } from '@/lib/viem_public';
import { ABIS } from '@/config/contracts';

export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, 'Invalid or expired token');
    }

    const body = await request.json();
    const { category, periodType, periodValue, year, country, keyword, authentication } = body;

    // Info: (20260128 - Luphia) Validate FIDO2 Signature OR Transaction Binding
    if (!authentication || !authentication.orderId) {
      return jsonFail(ApiCode.VALIDATION_ERROR, 'Order ID is required');
    }

    const orderId = authentication.orderId;
    const authWithTx = authentication as AuthenticationJSON & { transactionHash?: string };
    const txHash = authWithTx.transactionHash;

    try {
      if (txHash) {
        // Info: (20260209 - Tzuhan) Verify Transaction Binding
        console.log(`[Analysis] Verifying transaction binding for Order ${orderId} in Tx ${txHash}`);

        // Info: (20260209 - Tzuhan) 1. Get Transaction
        const tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` });
        if (!tx) {
          throw new Error('Transaction not found');
        }

        // Info: (20260209 - Tzuhan) 2. Decode EntryPoint.handleOps
        let foundUserOp = false;
        let verifiedHash = false;

        try {
          const handleOpsAbi = parseAbi([
            'function handleOps((address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature)[] ops, address beneficiary) external'
          ]);

          const { args } = decodeFunctionData({
            abi: handleOpsAbi,
            data: tx.input,
          });
          const ops = args[0];

          // Info: (20260209 - Tzuhan) 3. Find UserOp for this user
          for (const op of ops) {
            if (op.sender.toLowerCase() === user.address.toLowerCase()) {
              foundUserOp = true;
              // Info: (20260209 - Tzuhan) 4. Decode SCW.execute from callData
              // Info: (20260209 - Tzuhan) execute(address dest, uint256 value, bytes func)
              const executeAbi = parseAbi(['function execute(address, uint256, bytes) external']);

              const { args: executeArgs } = decodeFunctionData({
                abi: executeAbi,
                data: op.callData,
              });

              const innerCallData = executeArgs[2];

              // Info: (20260209 - Tzuhan) 5. Verify Hash
              const orderHash = keccak256(stringToBytes(orderId));
              /**
               * Info: (20260209 - Tzuhan)
               * The innerCallData should END with this hash (32 bytes = 64 hex chars)
               * innerCallData is `0x...`
               * remove 0x from orderHash
               */
              const hashHex = orderHash.slice(2).toLowerCase();
              if (innerCallData.toLowerCase().endsWith(hashHex)) {
                verifiedHash = true;
              } else {
                console.warn(`[Analysis] Hash mismatch. Expected end with ${hashHex}, got data ${innerCallData}`);
              }
              break;
            }
          }

        } catch (decodeError) {
          console.error('[Analysis] Failed to decode transaction:', decodeError);
          throw new Error('Invalid transaction structure');
        }

        if (!foundUserOp) {
          throw new Error('No UserOperation found for this user in the transaction');
        }
        if (!verifiedHash) {
          throw new Error('Transaction is not bound to this Order ID');
        }

        // Check if the UserOperation actually succeeded on-chain
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
        if (!receipt) {
          throw new Error('Transaction receipt not found');
        }

        let userOpSuccess = false;
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: ABIS.ENTRY_POINT,
              data: log.data,
              topics: log.topics,
            });
            if (decoded.eventName === 'UserOperationEvent') {
              const args = decoded.args as { sender: string; success: boolean };
              if (args.sender.toLowerCase() === user.address.toLowerCase()) {
                if (args.success) {
                  userOpSuccess = true;
                }
                break;
              }
            }
          } catch (e) {
            if (e instanceof Error && e.name !== 'AbiEventSignatureNotFoundError') {
              console.log('[Info: (20260304 - Tzuhan)] Ignoring log decode error:', e);
            }
          }
        }

        if (!userOpSuccess) {
          await orderGenerator.failOrder(orderId, 'UserOperation failed on-chain (e.g. out of gas or insufficient balance)');
          throw new AppError(ApiCode.VALIDATION_ERROR, 'The token transfer failed on-chain. Order cancelled.');
        }

        // Info: (20260209 - Tzuhan) Mark order as complete
        await orderGenerator.completeOrder(orderId, JSON.stringify({ verifiedVia: 'tx', txHash }), txHash);

      } else {
        // Info: (20260128 - Luphia) Fallback to Signature Verification (Legacy 2-step) or if txHash not provided

        // Info: (20260209 - Tzuhan) 1. Get Pending Order
        const order = await orderGenerator.getPendingOrder(orderId, user.id);

        // Info: (20260209 - Tzuhan) 2. Verify Signature
        await webAuthnService.verifySignature(user.address, authentication, order.challenge);

        // Info: (20260209 - Tzuhan) 3. Complete Order
        await orderGenerator.completeOrder(orderId, JSON.stringify(authentication), undefined);
      }

    } catch (error) {
      if (error instanceof AppError) {
        return jsonFail(error.code, error.message);
      }
      console.error('Order verification failed:', error);
      return jsonFail(ApiCode.UNAUTHORIZED, `Verification failed: ${(error as Error).message}`);
    }

    /**
     * Info: (20260128 - Luphia) Proceed with Analysis Generation
     * Data is already in Order, but we can use body too or trust order data
     * Using body params ensures consistency with frontend request, but ideally we use order.data
     */
    const result = await analysisService.generateAnalysis(user.id, {
      category,
      periodType,
      periodValue,
      year,
      country,
      keyword,
      orderId
    });

    return jsonOk(result);

  } catch (error) {
    console.error('[API] /user/analysis error:', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Failed to generate analysis');
  }
}

// Info: (20260128 - Luphia) Get analysis history for the user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, 'Invalid or expired token');
    }

    // Info: (20260128 - Luphia) Fetch analyses with related mission data
    const analyses = await analysisRepo.findByUserId(user.id);

    // Info: (20260128 - Luphia) Map DB result to response format
    const history = analyses.map(analysis => {
      const status = analysis.mission?.status?.toLowerCase() || 'unknown';
      let periodType = 'unknown';

      if (analysis.mission?.name) {
        const parts = analysis.mission.name.split('-');
        if (parts.length >= 3) {
          periodType = parts[2];
        }
      }

      // Info: (20260128 - Luphia) Safely access mission data, we assume mission.data has generatedAt
      const missionData = analysis.mission?.data as Record<string, unknown> | null;
      const generatedAt = typeof missionData?.generatedAt === 'string'
        ? missionData.generatedAt.split('T')[0]
        : analysis.createdAt.toISOString().split('T')[0];

      // Info: (20260128 - Luphia) Extract period info
      const year = typeof missionData?.year === 'number' ? missionData.year : new Date().getFullYear();
      // Info: (20260128 - Luphia) If periodType not in data, fallback to previous parsing or unknown
      let pType = typeof missionData?.periodType === 'string' ? missionData.periodType : periodType;
      // Info: (20260128 - Luphia) If still unknown and we have parsing logic success, use it
      if (pType === 'unknown' && periodType !== 'unknown') {
        pType = periodType;
      }

      const orderData = analysis.order?.data as Record<string, unknown> | null;
      const pValue = typeof missionData?.periodValue === 'string' || typeof missionData?.periodValue === 'number'
        ? missionData.periodValue as string | number
        : (orderData?.periodValue as string | number) || '';

      // Info: (20260128 - Luphia) Fallback periodType from order if unknown
      if (pType === 'unknown' && typeof orderData?.periodType === 'string') {
        pType = orderData.periodType;
      }

      let periodStr = 'N/A';
      if (pType !== 'unknown' && pValue !== '') {
        try {
          const { start, end } = getPeriodDateRange(pType, year, pValue);
          periodStr = start === end ? start : `${start} ~ ${end}`;
        } catch (e) {
          console.warn('Failed to calc date range', e);
        }
      }

      return {
        id: analysis.id,
        generatedAt,
        category: analysis.type,
        periodType: pType,
        period: periodStr,
        year,
        periodValue: pValue,
        status: status,
        reportId: analysis.id
      };
    });

    return jsonOk(history);

  } catch (error) {
    console.error('[API] GET /user/analysis error:', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Failed to fetch analysis history');
  }
}
