import { useState } from 'react';

export function useBase64() {
  const [base64, setBase64] = useState<string>('');

  const convertToBase64 = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setBase64(result);
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return { base64, convertToBase64 };
}
