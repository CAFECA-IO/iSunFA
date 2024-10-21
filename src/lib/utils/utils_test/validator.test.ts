import { APIName } from '@/constants/api_connection';
import { z } from 'zod';
import { validateApiResponse } from '@/lib/utils/validator';

describe('lib/utils/validate.ts', () => {
  describe('validateResponse', () => {
    const mockSchema = z.object({
      id: z.number(),
    });

    it('should return the response if the response is valid', () => {
      const dto = { id: 1 };
      const result = validateApiResponse({ dto, schema: mockSchema, apiName: APIName.ZOD_EXAMPLE });
      expect(result).toEqual(dto);
    });

    it('should filter out the response if the response has extra info', () => {
      const dto = { id: 1, extra: 'extra' };
      const result = validateApiResponse({ dto, schema: mockSchema, apiName: APIName.ZOD_EXAMPLE });
      expect(result).toEqual({ id: 1 });
      expect(result).not.toEqual(dto);
    });

    it('should throw an error if the response is invalid', () => {
      const dto = { id: 'string' };
      expect(() =>
        validateApiResponse({ dto, schema: mockSchema, apiName: APIName.ZOD_EXAMPLE })).toThrow();
    });
  });
});
