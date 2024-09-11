import React from 'react';
import Image from 'next/image';

const AvatarSVG = ({ size }: { size: 'large' | 'small' }) => {
  const width = size === 'large' ? 201 : 100;
  const height = width;
  return <Image src="/elements/avatar_default.svg" alt="avatar" width={width} height={height} />;
};

export default AvatarSVG;
