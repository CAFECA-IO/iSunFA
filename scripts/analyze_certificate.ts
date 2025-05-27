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
import { DefaultValue } from '@/constants/default_value';

/* Info: (20241128 - Jacky) Decrypt the certificate image and send it to AICH for analysis
 * 1. Fetch certificates without invoice
 * 2. Decrypt the certificate image
 * 3. Send the decrypted image to AICH for analysis
 * 4. Return the result ID if successful, otherwise log the error
 */
async function processCertificateFile(certificate: {
  id: number;
  fileId: number;
  accountBookId: number;
}) {
  loggerBack.info(`Processing certificate with ID: ${certificate.id}`);
  const file = await findFileById(certificate.fileId);
  let resultId = '';
  if (file) {
    loggerBack.info(`Found file with ID: ${file.id}`);
    // Info: (20241128 - Jacky) Read and decrypt the certificate image
    const filePath = parseFilePathWithBaseUrlPlaceholder(file.url);
    const fileBuffer = await readFile(filePath);
    const decryptFileBuffer = await decryptImageFile({
      imageBuffer: fileBuffer,
      file,
      companyId: certificate.accountBookId,
    });
    // Info: (20241128 - Jacky) Prepare the form data with decrypted image
    const fileBlob = bufferToBlob(decryptFileBuffer, file.mimeType);
    const formData = new FormData();
    formData.append('image', fileBlob);
    // Info: (20241128 - Jacky) Fetch the result ID from AICH and save
    resultId = await fetchResultIdFromAICH(AI_TYPE.CERTIFICATE, formData);
    if (!resultId) {
      loggerError({
        userId: DefaultValue.USER_ID.SYSTEM,
        errorType: 'FetchResultIdError',
        errorMessage: `Failed to fetch result ID for certificate ID: ${certificate.id}`,
      });
    } else {
      // Info: (20241128 - Jacky) Save AI result id to certificate
      await updateCertificateAiResultId(certificate.id, resultId);
      loggerBack.info(`Fetched result ID: ${resultId} for certificate ID: ${certificate.id}`);
    }
  } else {
    loggerBack.warn(`File not found for certificate ID: ${certificate.id}`);
  }
  return resultId;
}

async function analyzeCertificate() {
  // Info: (20241128 - Jacky) Step 1: Record the cron job execution time
  loggerBack.info('Starting certificate analysis process');
  try {
    // Info: (20241128 - Jacky) Step 2: Fetch certificates without invoice
    const certificatesWithoutInvoice = await listCertificateWithoutInvoice();
    loggerBack.info(`Fetched ${certificatesWithoutInvoice.length} certificates without invoice`);

    // Info: (20241128 - Jacky) Step 3: Ask AICH to analyze the certificate and get the request ID
    // Info: (20241128 - Jacky) Step 4: Save the request ID to database
    // ToDo: (20241128 - Jacky) Do not process sql query in loop
    const resultIdList = await Promise.all(certificatesWithoutInvoice.map(processCertificateFile));

    const validResultIdList = resultIdList.filter(Boolean);
    loggerBack.info('Certificate analysis process completed successfully');
    return validResultIdList;
  } catch (_error) {
    // Info: (20241128 - Jacky) Step 5: Record error if any
    const error = _error as Error;
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'CertificateAnalysisError',
      errorMessage: error,
    });
    // Info: (20241128 - Jacky) Step 6: Abort the process if error occurs
    throw error;
  }
}

// Info: (20241128 - Jacky) Execute the certificate analysis process periodically
(async () => {
  try {
    await analyzeCertificate();
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'CertificateAnalysisError',
      errorMessage: error,
    });
  }
})();
