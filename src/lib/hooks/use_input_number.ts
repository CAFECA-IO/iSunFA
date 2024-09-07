import { useState } from 'react';

/* Info: (20230324 - Shirley) 限制輸入數字 hooks */
const useInputNumber = (defaultVal = ''): [string, (val: string) => void] => {
  const [numVal, setNumVal] = useState(defaultVal);

  const handleChange = (val: string) => {
    // Info: (20230829 - Anna) 移除no-param-reassign註解，改將參數val的處理結果存在新變數，而不是直接重新賦值給val
    const sanitizedVal = val.replace(/[^-+\d]/g, '');
    setNumVal(sanitizedVal);
  };

  return [numVal, handleChange];
};

export default useInputNumber;
