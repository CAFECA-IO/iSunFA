import React, { useState, useRef, useEffect } from 'react';
import FocusLock from 'react-focus-lock';
import { useHotkeys, HotkeysProvider } from 'react-hotkeys-hook';

const DropmenuWithHotKey: React.FC = () => {
  const options = ['Option 1', 'Option 2', 'Option 3', 'Option 4', 'Option 5'];
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<string>('Please select an option');
  const [activeOptionIndex, setActiveOptionIndex] = useState<number>(0);

  useEffect(() => {
    // Info: (20241202 - Julian) 選項聚焦
    if (isMenuOpen && optionRefs.current[activeOptionIndex]) {
      optionRefs.current[activeOptionIndex]?.focus();
      optionRefs.current[activeOptionIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeOptionIndex, isMenuOpen]);

  // Info: (20241202 - Julian) 選單開關
  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  // Info: (20241202 - Julian) 處理方向鍵的切換邏輯
  const handleNavigation = (event: KeyboardEvent) => {
    event.preventDefault();

    if (isMenuOpen) {
      if (event.key === 'ArrowDown') {
        // Info: (20241202 - Julian) 選擇下一個選項
        setActiveOptionIndex((prev) => {
          // Info: (20241202 - Julian) 避免超出選項範圍
          const nextIndex = Math.min(prev + 1, options.length - 1);
          return nextIndex;
        });
      } else if (event.key === 'ArrowUp') {
        // Info: (20241202 - Julian) 選擇上一個選項
        setActiveOptionIndex((prev) => {
          // Info: (20241202 - Julian) 避免超出選項範圍
          const nextIndex = Math.max(prev - 1, 0);
          return nextIndex;
        });
      }

      // Info: (20241202 - Julian) 聚焦選項
      optionRefs.current[activeOptionIndex]?.focus();
    } else {
      // Info: (20241202 - Julian) 開啟選單，並聚焦第一個選項
      setIsMenuOpen(true);
      setActiveOptionIndex(0);
      optionRefs.current[0]?.focus();
    }
  };

  useHotkeys(['ArrowUp', 'ArrowDown'], handleNavigation, { scopes: 'Dropmenu' });

  const dropdownMenu = isMenuOpen ? (
    <div className="absolute top-50px z-30 w-300px rounded-sm border bg-white p-2 shadow-dropmenu">
      <div className="flex max-h-150px flex-col overflow-y-auto">
        {options.map((value, index) => {
          // Info: (20241202 - Julian) 選項點擊事件
          const optionClickHandler = () => {
            setSelectedOption(value);
            setIsMenuOpen(false);
          };

          // Info: (20241202 - Julian) 選項 ref
          const optionRef = (el: HTMLButtonElement) => {
            optionRefs.current[index] = el;
          };

          return (
            <button key={value} ref={optionRef} type="button" onClick={optionClickHandler}>
              {value}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div className="relative">
      <button type="button" onClick={toggleMenu} className="w-300px rounded-sm border p-2">
        <p>{selectedOption}</p>
      </button>
      {/* Info: (20241202 - Julian) Accounting Menu */}
      {dropdownMenu}
    </div>
  );
};

const FormWithHotKey: React.FC = () => {
  const inputs = ['Input 1', 'Input 2', 'Input 3', 'Input 4', 'Input 5'];
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Info: (20241202 - Julian) 清空輸入框
  const clearHandler = () => {
    inputRefs.current.forEach((input) => {
      // eslint-disable-next-line no-param-reassign
      if (input) input.value = '';
    });
  };

  // Info: (20241202 - Julian) 提交表單
  const submitHandler = (event: React.FormEvent) => {
    event.preventDefault();
    const values = inputRefs.current.map((input) => input?.value);
    // eslint-disable-next-line no-alert
    alert(values);
  };

  // Info: (20241202 - Julian) Tab 鍵切換行為
  useHotkeys(
    'tab',
    (event) => {
      event.preventDefault();
      const currentIndex = inputRefs.current.findIndex((input) => input === document.activeElement);
      // Info: (20241202 - Julian) 循環切換
      const nextIndex = (currentIndex + 1) % inputRefs.current.length;
      inputRefs.current[nextIndex]?.focus();
    },
    { scopes: 'Form' } // Info: (20241202 - Julian) 設定 scope
  );

  // Info: (20241202 - Julian) ctrl + enter 提交表單
  useHotkeys(
    'ctrl+enter',
    (event) => {
      event.preventDefault();
      const values = inputRefs.current.map((input) => input?.value);
      // eslint-disable-next-line no-alert
      alert(values);
    },
    { scopes: 'Form' }
  );

  // Info: (20241202 - Julian) ctrl + shift + c 清空輸入框
  useHotkeys('ctrl+shift+c', clearHandler, { scopes: 'Form' });

  return (
    <form onSubmit={submitHandler}>
      <div className="grid grid-cols-3 gap-10px">
        {inputs.map((input, index) => (
          <input
            key={input}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            placeholder={input}
            className="rounded-sm border p-2"
          />
        ))}
      </div>

      <div className="flex gap-10px">
        <button type="button" className="rounded-sm border p-2" onClick={clearHandler}>
          Clear
        </button>
        <button type="submit" className="rounded-sm bg-amber-400 p-2">
          Submit
        </button>
      </div>
    </form>
  );
};

// const FirstCounting: React.FC = () => {
//   const [count, setCount] = useState(0);
//   useHotkeys('ctrl+shift+c', () => setCount((prevCount) => prevCount + 1), { scopes: 'First' });

//   return <p className="text-red-500">The outside count is {count}.</p>;
// };

// const SecondCounting: React.FC = () => {
//   const [count, setCount] = useState(0);
//   useHotkeys('ctrl+shift+c', () => setCount((prevCount) => prevCount + 1), { scopes: 'Second' });

//   return <p className="text-blue-500">The inside count is {count}.</p>;
// };

const TestPage: React.FC = () => {
  return (
    /* Info: (20241202 - Julian) 限制焦點在頁面內 */
    <FocusLock>
      {/* Info: (20241202 - Julian) 表單 */}
      <HotkeysProvider initiallyActiveScopes={['Form']}>
        <FormWithHotKey />
      </HotkeysProvider>
      {/* Info: (20241202 - Julian) 下拉選單 */}
      <HotkeysProvider initiallyActiveScopes={['Dropmenu']}>
        <DropmenuWithHotKey />
      </HotkeysProvider>
    </FocusLock>
  );
};

export default TestPage;
