import { STATUS_MESSAGE } from '@/constants/status_code';
import { ICompanyKYC } from '@/interfaces/company_kyc';
import { IResponseData } from '@/interfaces/response_data';
import { checkAdmin } from '@/lib/utils/auth_check';
import { formatApiResponse } from '@/lib/utils/common';
import { parseForm } from '@/lib/utils/parse_image_form';
import { createCompanyKYC } from '@/lib/utils/repo/company_kyc';
import formidable from 'formidable';
import { NextApiRequest, NextApiResponse } from 'next';

// Info Murky (20240424) 要使用formidable要先關掉bodyParsor
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICompanyKYC>>
) {
  try {
    // Info: (20240419 - Jacky) K012001 - POST /kyc/entity
    if (req.method === 'POST') {
      const session = await checkAdmin(req, res);
      const { companyId } = session;
      let files: formidable.Files;
      let fields: formidable.Fields;
      try {
        const parsedForm = await parseForm(req);
        files = parsedForm.files;
        fields = parsedForm.fields;
      } catch (error) {
        throw new Error(STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR);
      }
      const { registrationCertificate, taxCertificate, representativeIdCard } = files;
      if (!registrationCertificate || !taxCertificate || !representativeIdCard) {
        throw new Error(STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR);
      }
      // Todo: (20240517 - Jacky) send image to cloud storage
      // const promises = [uploadImage(businessRegi), uploadImage(taxStatus), uploadImage(passport)];
      const {
        legalName,
        country,
        city,
        address,
        zipCode,
        representativeName,
        registerCountry,
        structure,
        registrationNumber,
        registrationDate,
        industry,
        contactPerson,
        contactPhone,
        contactEmail,
        website,
        representativeIdType,
      } = fields;
      if (
        !legalName ||
        !country ||
        !city ||
        !address ||
        !zipCode ||
        !representativeName ||
        !registerCountry ||
        !structure ||
        !registrationNumber ||
        !registrationDate ||
        !industry ||
        !contactPerson ||
        !contactPhone ||
        !contactEmail ||
        !website ||
        !representativeIdType
      ) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      // Todo: (20240517 - Jacky) get image ids from cloud storage
      // const imageIds = promise.all(promises);
      const { registrationCertificateId, taxCertificateId, representativeIdCardId } = {
        registrationCertificateId: '123',
        taxCertificateId: '123',
        representativeIdCardId: '123',
      };
      const companyKYC: ICompanyKYC = await createCompanyKYC(
        companyId,
        legalName[0],
        country[0],
        city[0],
        address[0],
        zipCode[0],
        representativeName[0],
        structure[0],
        registrationNumber[0],
        registrationDate[0],
        industry[0],
        contactPerson[0],
        contactPhone[0],
        contactEmail[0],
        website[0],
        representativeIdType[0],
        registrationCertificateId,
        taxCertificateId,
        representativeIdCardId
      );
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
