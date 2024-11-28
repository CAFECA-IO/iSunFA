import {
  listCertificateWithoutInvoice,
  updateCertificateAiResultId,
} from '@/lib/utils/repo/certificate.repo';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { readFile } from 'fs/promises';
import { decryptImageFile, parseFilePathWithBaseUrlPlaceholder } from '@/lib/utils/file';
import { bufferToBlob } from '@/lib/utils/parse_image_form';
import { findFileById } from '@/lib/utils/repo/file.repo';
import { fetchResultIdFromAICH } from '@/lib/utils/aich';
import { AI_TYPE } from '@/constants/aich';

async function processCertificateFile(certificate: {
  id: number;
  fileId: number;
  companyId: number;
}) {
  loggerBack.info(`Processing certificate with ID: ${certificate.id}`);
  const file = await findFileById(certificate.fileId);
  let resultId = '';
  if (file) {
    loggerBack.info(`Found file with ID: ${file.id}`);
    const filePath = parseFilePathWithBaseUrlPlaceholder(file.url);
    const fileBuffer = await readFile(filePath);
    const decryptFileBuffer = await decryptImageFile({
      imageBuffer: fileBuffer,
      file,
      companyId: certificate.companyId,
    });
    const fileBlob = bufferToBlob(decryptFileBuffer, file.mimeType);
    const formData = new FormData();
    formData.append('image', fileBlob);

    resultId = await fetchResultIdFromAICH(AI_TYPE.CERTIFICATE, formData);
    if (!resultId) {
      loggerError({
        userId: 0, // ToDo: (20241128 - Jacky) Add Robot ID
        errorType: 'FetchResultIdError',
        errorMessage: `Failed to fetch result ID for certificate ID: ${certificate.id}`,
      });
    } else {
      await updateCertificateAiResultId(certificate.id, resultId);
      loggerBack.info(`Fetched result ID: ${resultId} for certificate ID: ${certificate.id}`);
    }
  } else {
    loggerBack.warn(`File not found for certificate ID: ${certificate.id}`);
  }
  return resultId;
}

async function analyzeCertificate() {
  loggerBack.info('Starting certificate analysis process');
  try {
    const certificatesWithoutInvoice = await listCertificateWithoutInvoice();
    loggerBack.info(`Fetched ${certificatesWithoutInvoice.length} certificates without invoice`);

    const resultIdList = await Promise.all(certificatesWithoutInvoice.map(processCertificateFile));

    const validResultIdList = resultIdList.filter(Boolean);
    loggerBack.info('Certificate analysis process completed successfully');
    return validResultIdList;
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId: 0, // ToDo: (20241128 - Jacky)  Add Robot ID
      errorType: 'CertificateAnalysisError',
      errorMessage: error,
    });
    throw error;
  }
}

(async () => {
  try {
    await analyzeCertificate();
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId: 0, // ToDo: (20241128 - Jacky)  Add Robot ID
      errorType: 'CertificateAnalysisError',
      errorMessage: error,
    });
  }
})();
