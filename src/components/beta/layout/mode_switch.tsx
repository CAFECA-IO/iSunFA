import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useDashboardCtx } from '@/contexts/dashboard_context';
import { cn } from '@/lib/utils/common';

interface ModeProps {
  handleModeSwitch: () => void;
}

const LightMode: React.FC<ModeProps> = ({ handleModeSwitch }) => {
  return (
    <button
      type="button"
      onClick={handleModeSwitch}
      className="flex w-62px items-center justify-between rounded-full bg-surface-support-soft-maple p-2px"
    >
      <div className="flex h-32px w-32px shrink-0 items-center justify-center rounded-full bg-surface-neutral-surface-lv2">
        <Image
          src="/icons/light_mode_selected.svg"
          alt="light_mode_selected"
          width={18}
          height={18}
        />
      </div>

      <div className="flex w-30px items-center justify-center">
        <Image
          src="/icons/dark_mode_unselected.svg"
          alt="dark_mode_unselected"
          width={18}
          height={18}
        />
      </div>
    </button>
  );
};

const DarkMode: React.FC<ModeProps> = ({ handleModeSwitch }) => {
  return (
    <button
      type="button"
      onClick={handleModeSwitch}
      className="flex w-62px items-center justify-between rounded-full bg-surface-support-soft-baby p-2px"
    >
      <div className="flex w-30px items-center justify-center">
        <Image
          src="/icons/light_mode_unselected.svg"
          alt="light_mode_unselected"
          width={18}
          height={18}
        />
      </div>

      <div className="flex h-32px w-32px shrink-0 items-center justify-center rounded-full bg-surface-neutral-surface-lv2">
        <Image
          src="/icons/dark_mode_selected.svg"
          alt="dark_mode_selected"
          width={18}
          height={18}
        />
      </div>
    </button>
  );
};

const ModeSwitch = () => {
  const { isSideMenuOpen } = useDashboardCtx();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    // Info: (20250702 - Julian) 檢查 class是否已包含 'dark'
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const handleModeSwitch = () => {
    setIsDarkMode((prev) => !prev);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div
      className={cn('', {
        'tablet:hidden laptop:block': isSideMenuOpen,
      })}
    >
      {isDarkMode ? (
        <DarkMode handleModeSwitch={handleModeSwitch} />
      ) : (
        <LightMode handleModeSwitch={handleModeSwitch} />
      )}
    </div>
  );
};

export default ModeSwitch;
