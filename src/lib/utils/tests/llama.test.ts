import LlamaConnect from '../llama';

// Mock the fetch API
global.fetch = jest.fn();

// Define a type cleaner function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const typeCleaner = (rawData: any) => {
  return rawData; // Simply returns the input as output for simplicity
};

describe('LlamaConnect', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let llamaConnect: LlamaConnect<any>;

  beforeEach(() => {
    process.env.LLAMA_URL = 'https://fake-url.com';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    llamaConnect = new LlamaConnect<any>(
      'model123',
      'Prompt text',
      '{ "expected": "json format" }',
      typeCleaner,
      3
    );
    (fetch as jest.Mock).mockClear();
  });

  it('should throw an error if LLAMA_URL is not set', () => {
    delete process.env.LLAMA_URL;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => new LlamaConnect<any>('model', 'prompt', '{}', typeCleaner)).toThrow();
  });

  it('should handle a successful llama API response', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ context: [], response: '```json {"valid": true}```' }),
    });

    const result = await llamaConnect.generateData('test input');
    expect(result).toEqual({ valid: true });
  });

  it('should retry requests when response is null', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ context: [], response: 'invalid response' }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ context: [], response: '```json {"valid": true}```' }),
      });

    const result = await llamaConnect.generateData('test input');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ valid: true });
  });

  it('should return null after exceeding retry limits', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ context: [], response: 'invalid response' }),
    });

    const result = await llamaConnect.generateData('test input');
    expect(fetch).toHaveBeenCalledTimes(3 + 1); // Default retry limit is 3 and 1 initial request
    expect(result).toBeNull();
  });
});
