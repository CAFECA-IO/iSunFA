import { APIName } from '@/constants/api_connection';
import { ocrListValidator, ocrUploadValidator } from '@/lib/utils/zod_schema/ocr';
import { zodExampleValidator } from '@/lib/utils/zod_schema/zod_example';

/*
 * Info: (20240909 - Murky) Record need to implement all the keys of the enum,
 * it will cause error when not implement all the keys
 * use code below after all the keys are implemented
 */

// import { IZodValidator } from "@/interfaces/zod_validator";
// export const API_ZOD_SCHEMA: Record<APIName, IZodValidator> = {
//     [APIName.ZOD_EXAMPLE]: zodExampleValidator,
// };

export const API_ZOD_SCHEMA = {
  [APIName.ZOD_EXAMPLE]: zodExampleValidator,
  [APIName.OCR_LIST]: ocrListValidator,
  [APIName.OCR_UPLOAD]: ocrUploadValidator,
};
