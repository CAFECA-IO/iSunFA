import { ERROR_CODE } from '@/constants/error_code';

export function errorMessageToErrorCode(errorMessage: string): number {
  // Define your error code mappings here

  // Check if the error message exists in the mappings
  if (errorMessage in ERROR_CODE) {
    return ERROR_CODE[errorMessage as keyof typeof ERROR_CODE];
  }

  // Return a default error code if no mapping is found, so that we can know that there is real error
  return -1;
}
