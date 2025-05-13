import React from 'react';

export enum LoaderSize {
  SMALL = 'h-4 w-4 border-1',
  MEDIUM = 'h-8 w-8 border-2',
  LARGE = 'h-16 w-16 border-4',
}

interface LoaderProps {
  size?: LoaderSize;
  notScreen?: boolean;
}

const Loader: React.FC<LoaderProps> = ({ size = LoaderSize.LARGE, notScreen }) => {
  return (
    <div className={`flex items-center justify-center ${notScreen ? '' : 'h-screen'}`}>
      <div
        className={`animate-spin rounded-full border-4 border-orange-400 border-t-transparent ${size}`}
      ></div>
    </div>
  );
};

export default Loader;
