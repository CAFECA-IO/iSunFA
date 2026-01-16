import { NextRequest } from 'next/server';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
import { loggerFromRequest } from '@/lib/utils/logger';
import { bundlerService } from '@/services/bundler.service';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  const log = loggerFromRequest(req);
  log.info('[PoC 2.3] Minimal Bundler: Received eth_sendUserOperation');

  try {
    // Info: (20251118 - Tzuhan) 一個標準的 eth_sendUserOperation 請求包含 [UserOperation, EntryPointAddress]
    const { userOp, entryPointAddress } = await req.json();

    if (!entryPointAddress) {
      return jsonFail(ApiCode.VALIDATION_ERROR, 'entryPointAddress is required');
    }

    const result = await bundlerService.sendUserOp(userOp, entryPointAddress);

    log.info(`[PoC 2.3] 交易已打包! Tx: ${result.transactionHash}`);

    return jsonOk({
      message: 'UserOperation processed by minimal bundler',
      transactionHash: result.transactionHash,
      status: result.status,
    });
  } catch (err) {
    const isZodError = err instanceof z.ZodError;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    log.warn(`[PoC 2.3] Bundler Failed: ${errorMessage}`);

    const isConfigError = errorMessage.includes('Server configuration error');

    log.warn(
      `[PoC 2.3/2.5] Bundler: Failed. ${isZodError ? 'Validation Error' : isConfigError ? 'Config Error' : 'Simulation/Execution Error'}: ${errorMessage}`,
      isZodError ? { errors: (err as z.ZodError).format() } : {}
    );

    // Info: (20251118 - Tzuhan) 區分伺服器設定錯誤 (500) 和 Zod 驗證錯誤 (400)
    if (isConfigError) {
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, errorMessage);
    }
    if (isZodError) {
      return jsonFail(ApiCode.VALIDATION_ERROR, 'Invalid UserOperation structure');
    }

    if (isZodError) return jsonFail(ApiCode.VALIDATION_ERROR, 'Invalid UserOperation structure');

    return jsonOk({
      error: 'Transaction failed or reverted',
      details: errorMessage,
    });
  }
}
