import React from 'react';
import Image from 'next/image';
import { LOCATION_OPTION, currencyByLocation, LocationType } from '@/constants/location';
import { FaChevronDown } from 'react-icons/fa6';
import useOuterClick from '@/lib/hooks/use_outer_click';

interface ILocationDropdownProps {
  currentLocation: string;
  setCurrentLocation: (location: string) => void;
}

const LocationDropdown: React.FC<ILocationDropdownProps> = ({
  currentLocation,
  setCurrentLocation,
}) => {
  const locationList = Object.values(LOCATION_OPTION);
  const currStr =
    currencyByLocation[currentLocation as LocationType] ?? currencyByLocation[LocationType.TW];

  const {
    targetRef,
    componentVisible: isOpen,
    setComponentVisible: setIsOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const toggleLocationMenu = () => setIsOpen((prev) => !prev);

  const imgSrc = `/currencies/${currStr.toLowerCase()}.svg`;

  const dropMenu = locationList.map((local) => {
    const countryClickHandler = () => setCurrentLocation(local);
    const localSrc =
      currencyByLocation[local as LocationType] ?? currencyByLocation[LocationType.TW];

    return (
      <div
        key={local}
        onClick={countryClickHandler}
        className="flex items-center gap-12px px-12px py-8px text-dropdown-text-primary hover:cursor-pointer hover:bg-dropdown-surface-item-hover"
      >
        <Image
          src={`/currencies/${localSrc.toLowerCase()}.svg`}
          width={16}
          height={16}
          alt="location_icon"
          className="aspect-square rounded-full object-cover"
        />
        <p>{local}</p>
      </div>
    );
  });

  return (
    <div
      ref={targetRef}
      className="relative flex w-full items-center divide-x divide-input-stroke-input rounded-sm border border-input-stroke-input bg-input-surface-input-background font-medium"
    >
      <div
        onClick={toggleLocationMenu}
        className="flex flex-1 items-center gap-24px px-12px py-10px hover:cursor-pointer"
      >
        <Image
          width={16}
          height={16}
          alt="location_icon"
          src={imgSrc}
          className="aspect-square rounded-full object-cover"
        />
        <div className="flex-1 text-input-text-input-filled">{currentLocation}</div>
        <div
          className={`text-icon-surface-single-color-primary ${isOpen ? 'rotate-180' : 'rotate-0'}`}
        >
          <FaChevronDown />
        </div>
        <div
          className={`absolute left-0 top-50px z-10 grid w-full rounded-sm ${
            isOpen
              ? 'grid-rows-1 border-dropdown-stroke-menu shadow-dropmenu'
              : 'grid-rows-0 border-transparent'
          } overflow-hidden transition-all duration-300 ease-in-out`}
        >
          <div className="flex flex-col rounded-sm border border-input-stroke-input bg-input-surface-input-background p-8px">
            {dropMenu}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationDropdown;
