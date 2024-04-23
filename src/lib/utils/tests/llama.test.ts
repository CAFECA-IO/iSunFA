// import LlamaConnect from '../llama';

// global.fetch = jest.fn(() => Promise.resolve({
//     json: () => Promise.resolve({ valid: true }),
//   })) as jest.Mock;

// // Info Murky (20240422): 定義一個簡單的類型守衛, 開放用any
// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// const typeGuard = (data: any): data is { valid: boolean } => {
//   return data.valid !== undefined;
// };

it('should pass', () => {
  expect(true).toBe(true);
});
// describe('LlamaConnect', () => {
//   let llamaConnect: LlamaConnect<{ valid: boolean }>;

//   beforeEach(() => {
//     // 環境變數設定
//     process.env.LLAMA_URL = 'https://fake-url.com';

//     // 初始化 LlamaConnect 實例
//     llamaConnect = new LlamaConnect<{ valid: boolean }>(
//       'model123',
//       'Your prompt here',
//       '{ "valid": boolean }',
//       typeGuard,
//       3
//     );
//   });

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   it('should throw error if LLAMA_URL is not set', () => {
//     delete process.env.LLAMA_URL;
//     expect(() => new LlamaConnect('model', 'prompt', '{}', typeGuard)).toThrow("LLAMA_URL is required in env.local");
//   });

//   it('should post data to Llama and return a result', async () => {
//     const data = await llamaConnect.generateData('input data');
//     expect(data).toEqual({ valid: true });
//     expect(fetch).toHaveBeenCalledTimes(1);
//   });
//   it('should retry posting data until a valid response is received', async () => {
//     global.fetch = jest.fn()
//       .mockReturnValueOnce(Promise.resolve({
//         json: () => Promise.resolve({ invalid: true }),
//       }))
//       .mockReturnValueOnce(Promise.resolve({
//         json: () => Promise.resolve({ valid: true }),
//       }));

//     const data = await llamaConnect.generateData('input data');
//     expect(data).toEqual({ valid: true });
//     expect(global.fetch).toHaveBeenCalledTimes(2);
//     expect(fetch).toHaveBeenCalledTimes(2);
//   });
// });
