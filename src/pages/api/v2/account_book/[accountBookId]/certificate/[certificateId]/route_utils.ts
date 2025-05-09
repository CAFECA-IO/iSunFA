import { STATUS_MESSAGE } from '@/constants/status_code';
import loggerBack from '@/lib/utils/logger_back';
import { getOneCertificateById } from '@/lib/utils/repo/certificate.repo';
import { Logger } from 'pino';

export const certificateGetOneAPIUtils = {
  /**
   * Info: (20241025 - Murky)
   * @description throw StatusMessage as Error, but it can log the errorMessage
   * @param logger - pino Logger
   * @param options - errorMessage and statusMessage
   * @param options.errorMessage - string, message you want to log
   * @param options.statusMessage - string, status message you want to throw
   * @throws Error - statusMessage
   */
  throwErrorAndLog: (
    logger: Logger,
    {
      errorMessage,
      statusMessage,
    }: {
      errorMessage: string;
      statusMessage: string;
    }
  ) => {
    logger.error(errorMessage);
    throw new Error(statusMessage);
  },
  getCertificateByIdFromPrisma: async (certificateId: number) => {
    const certificate = await getOneCertificateById(certificateId, {
      isDeleted: false,
    });

    if (!certificate) {
      certificateGetOneAPIUtils.throwErrorAndLog(loggerBack, {
        errorMessage: `Certificate not found with id: ${certificateId}`,
        statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND,
      });
    }
    return certificate!;
  },
};
