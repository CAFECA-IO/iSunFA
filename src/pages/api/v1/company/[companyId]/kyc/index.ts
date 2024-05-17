import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ICompanyKYC } from '@/interfaces/company_kyc';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import { parseForm } from '@/lib/utils/parse_image_form';
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
      if (!req.headers.userid) {
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
      }
      const companyIdNum = Number(req.query.companyId);
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
      const companyKYC: ICompanyKYC = await prisma.companyKYC.create({
        data: {
          company: {
            connect: {
              id: companyIdNum,
            },
          },
          legalName: legalName[0],
          country: country[0],
          city: city[0],
          address: address[0],
          zipCode: zipCode[0],
          representativeName: representativeName[0],
          registerCountry: registerCountry[0],
          structure: structure[0],
          registrationNumber: registrationNumber[0],
          registrationDate: registrationDate[0],
          industry: industry[0],
          contactPerson: contactPerson[0],
          contactPhone: contactPhone[0],
          contactEmail: contactEmail[0],
          website: website[0],
          representativeIdType: representativeIdType[0],
          registrationCertificateId,
          taxCertificateId,
          representativeIdCardId,
          createdAt: timestampInSeconds(Date.now()),
        },
      });
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
