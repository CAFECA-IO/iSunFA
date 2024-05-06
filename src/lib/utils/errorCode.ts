export function errorMessageToErrorCode(errorMessage: string): number {
  // Define your error code mappings here
  const errorMappings: { [key: string]: number } = {
    'Unauthorized access': 401,
    'Resource not found': 404,
    'Method Not Allowed': 405,
    'Invalid input parameter': 422,
    'Internal server error': 500,
    'fetch failed': 500,
    'Bad Gateway': 502,
    'Gateway Timeout': 504,
    // Add more error mappings as needed
  };

  // Check if the error message exists in the mappings
  if (errorMessage in errorMappings) {
    return errorMappings[errorMessage];
  }

  // Return a default error code if no mapping is found
  return -1;
}
