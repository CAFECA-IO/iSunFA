import { APIName } from '@/constants/api_connection';
import { NextApiRequest } from 'next';
import { validateRequest } from '@/lib/utils/validator';

describe('lib/utils/validate.ts', () => {
  describe('validateRequest', () => {
    const mockRequest = {
      query: { name: 'test', age: '20', email: '123@123.io', password: '11144425', testEnum: 'A' },
      body: {},
      method: 'GET',
      headers: { 'user-agent': 'jest' },
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as NextApiRequest;

    it('should validate and format query and body correctly', () => {
      const apiName = APIName.ZOD_EXAMPLE;
      const result = validateRequest(apiName, mockRequest, 1);
      expect(result).toEqual({
        query: { name: 'test', age: 20, email: '123@123.io', password: '11144425', testEnum: 'A' },
        body: {},
      });
    });

    it('should return null for invalid query', () => {
      const invalidRequest = {
        ...mockRequest,
        query: { id: 'invalid' },
      } as unknown as NextApiRequest;
      const apiName = APIName.ZOD_EXAMPLE;
      const result = validateRequest(apiName, invalidRequest, 1);
      expect(result).toEqual({
        query: null,
        body: null,
      });
    });

    it('should return null for invalid body', () => {
      const invalidRequest = {
        ...mockRequest,
        query: { age: 123 },
      } as unknown as NextApiRequest;
      const apiName = APIName.ZOD_EXAMPLE;
      const result = validateRequest(apiName, invalidRequest, 1);
      expect(result).toEqual({
        query: null,
        body: null,
      });
    });

    it('should log error and return null if validation fails', () => {
      const invalidRequest = {
        ...mockRequest,
        query: { id: 'invalid' },
        body: { name: 123 },
      } as unknown as NextApiRequest;
      const apiName = APIName.ZOD_EXAMPLE;
      const result = validateRequest(apiName, invalidRequest, 1);
      expect(result).toEqual({
        query: null,
        body: null,
      });
    });
  });
});
