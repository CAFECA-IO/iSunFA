import { useState } from 'react';

/* Info: (20230324 - Shirley) 限制輸入數字 hooks */
const useInputNumber = (defaultVal = ''): [string, (val: string) => void] => {
  const [numVal, setNumVal] = useState(defaultVal);

  const handleChange = (val: string) => {
    // eslint-disable-next-line no-param-reassign
    val = val.replace(/[^-+\d]/g, '');
    setNumVal(val);
  };

  return [numVal, handleChange];
};

export default useInputNumber;
