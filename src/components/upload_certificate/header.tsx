// Deprecated: (20240919 - tzuhan) will be replaced by the proper side menu component created by the @Liz
import React from 'react';

const Header = () => {
  return (
    <header className="flex items-center justify-between bg-white p-4 shadow-sm">
      <h1 className="text-xl font-semibold">Upload certificate</h1>
      <div className="flex items-center space-x-4">
        {/* Info: (20240919 - tzuhan) 工具列按鈕及使用者圖示 */}
        <button type="button" className="rounded bg-gray-100 p-2">
          工具1
        </button>
        <button type="button" className="rounded bg-gray-100 p-2">
          工具2
        </button>
        <div className="h-8 w-8 rounded-full bg-gray-200"></div>
      </div>
    </header>
  );
};

export default Header;
