// Deprecated: (20240919 - tzuhan) will be replaced by the proper side menu component created by the @Liz
import React from 'react';

const SideMenu = () => {
  return (
    <aside className="h-screen min-w-280px border-r bg-surface-neutral-surface-lv2 p-4">
      <nav className="flex flex-col space-y-4">
        {['會計記帳', '資產管理', '人事管理', '報表作業', '參數設定', '回到首頁'].map(
          (item, index) => (
            <button
              type="button"
              key={`sidemenu-${index + 1}`}
              className="rounded p-2 text-left hover:bg-gray-200"
            >
              {item}
            </button>
          )
        )}
      </nav>
    </aside>
  );
};

export default SideMenu;
