import React from 'react';

export enum LinearTextSize {
  XL = 'xl',
  LG = 'lg',
  MD = 'md',
  SM = 'sm',
}

export enum TextAlign {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right',
}

interface ILinearGradientTextProps {
  size: LinearTextSize;
  align: TextAlign;
  children: React.ReactNode;
}

export const LinearGradientText: React.FC<ILinearGradientTextProps> = ({
  size,
  align,
  children,
}) => {
  const fontStyle =
    size === LinearTextSize.XL
      ? 'text-28px font-black md:text-48px lg:text-80px'
      : size === LinearTextSize.LG
        ? 'text-2xl font-bold md:text-48px lg:text-60px'
        : size === LinearTextSize.MD
          ? 'text-36px font-bold md:text-44px'
          : 'text-lg font-bold md:text-28px';

  const textAlign =
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

  return (
    <div
      className={`${fontStyle} ${textAlign} text-dm-sans bg-gradient-to-b from-landing-page-white via-landing-page-taupe to-landing-page-taupe2 bg-clip-text text-transparent`}
    >
      {children}
    </div>
  );
};

export default LinearGradientText;
