import React from 'react';
import Image from 'next/image';

interface IFavoriteButtonProps {
  isActive: boolean;
  clickHandler: () => void;
}

const FavoriteButton: React.FC<IFavoriteButtonProps> = ({ isActive, clickHandler }) => {
  return (
    <button type="button" onClick={clickHandler} className="group">
      {isActive ? (
        <Image src="/icons/star_active.svg" width={32} height={32} alt="star_active" />
      ) : (
        <div className="relative">
          <Image src="/icons/star_default.svg" width={32} height={32} alt="star_default" />
          <Image
            src="/icons/star_hover.svg"
            width={32}
            height={32}
            alt="star_default"
            // Info: (20250402 - Julian) Hover Icon
            className="absolute top-0 z-10 hidden group-hover:block"
          />
        </div>
      )}
    </button>
  );
};

export default FavoriteButton;
