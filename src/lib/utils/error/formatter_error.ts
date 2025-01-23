import { z } from 'zod';

/**
 * Info: (20241021 - Murky)
 * This error will be thrown if dto not passing validateApiResponse
 */
export class FormatterError extends Error {
  /**
   * Info: (20241021 - Murky)
   * The original data that need to be validated but failed
   */
  dto: unknown;

  zodErrorMessage: string;

  issues: z.ZodIssue[];

  constructor(
    message: string,
    option: { dto: unknown; zodErrorMessage: string; issues: z.ZodIssue[] }
  ) {
    super(message);
    this.name = 'FormatterError';
    this.dto = option.dto;
    this.zodErrorMessage = option.zodErrorMessage;
    this.issues = option.issues;
  }
}
