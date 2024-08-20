import { AICH_URI } from "@/constants/config";
import { AICH_APIS_TYPES } from "@/constants/aich";

/**
 * Generates the URL for the given endpoint.
 *
 * @param endpoint - The endpoint to fetch. Can be "upload" or "process_status".
 * @param aichResultId - The ID required for the "process_status" endpoint. Must be provided if endpoint is "process_status".
 * @returns The complete URL as a string.
 * @throws Will throw an error if `aichResultId` is not provided when endpoint is "process_status".
 */
export function getAichUrl(endPoint: AICH_APIS_TYPES, aichResultId?: string): string {
    switch (endPoint) {
        case AICH_APIS_TYPES.UPLOAD_OCR:
            return `${AICH_URI}/api/v1/ocr/upload`;
        case AICH_APIS_TYPES.GET_OCR_RESULT_ID:
            if (!aichResultId) {
                throw new Error('AICH Result ID is required');
            }
            return `${AICH_URI}/api/v1/ocr/${aichResultId}/process_status`;
        case AICH_APIS_TYPES.GET_OCR_RESULT:
            if (!aichResultId) {
                throw new Error('AICH Result ID is required');
            }
            return `${AICH_URI}/api/v1/ocr/${aichResultId}/result`;
        case AICH_APIS_TYPES.UPLOAD_INVOICE:
            return `${AICH_URI}/api/v1/invoices/upload`;
        case AICH_APIS_TYPES.GET_INVOICE_RESULT_ID:
            if (!aichResultId) {
                throw new Error('AICH Result ID is required');
            }
            return `${AICH_URI}/api/v1/invoices/${aichResultId}/process_status`;
        case AICH_APIS_TYPES.GET_INVOICE_RESULT:
            if (!aichResultId) {
                throw new Error('AICH Result ID is required');
            }
            return `${AICH_URI}/api/v1/invoices/${aichResultId}/result`;
        default:
            throw new Error('Invalid AICH API Type');
    }
}
