import { STATUS_MESSAGE } from '@/constants/status_code';
import { ICompanyKYC, ICompanyKYCForm } from '@/interfaces/company_kyc';
import { IResponseData } from '@/interfaces/response_data';
import { checkAdmin } from '@/lib/utils/auth_check';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { createCompanyKYC } from '@/lib/utils/repo/company_kyc.repo';
import { isCompanyKYC, isCompanyKYCForm } from '@/lib/utils/type_guard/company_kyc';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICompanyKYC>>
) {
  try {
    // Info: (20240419 - Jacky) K012001 - POST /kyc/entity
    if (req.method === 'POST') {
      const session = await checkAdmin(req, res);
      const { companyId } = session;
      const companyKYCForm: ICompanyKYCForm = req.body;
      const bodyType = isCompanyKYCForm(companyKYCForm);
      if (!bodyType) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const companyKYC = await createCompanyKYC(companyId, companyKYCForm);
      const payloadType = isCompanyKYC(companyKYC);
      if (!payloadType) {
        throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
      }
      const { httpCode, result } = formatApiResponse<ICompanyKYC>(
        STATUS_MESSAGE.CREATED,
        companyKYC
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<ICompanyKYC>(error.message, {} as ICompanyKYC);
    res.status(httpCode).json(result);
  }
}
