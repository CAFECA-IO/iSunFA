import React, { useState } from 'react';
import Image from 'next/image';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { FaChevronDown } from 'react-icons/fa6';
import { FiSearch } from 'react-icons/fi';

const JobFilterSection: React.FC = () => {
  const typeOptions = ['All', 'Full Time', 'Part Time', 'Internship', 'Remote', 'My Favorite'];
  const locationOptions = ['All', 'Taipei, TW', 'Kaohsiung, TW', 'New York, US'];

  const [selectedType, setSelectedType] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [searchKeyword, setSearchKeyword] = useState('');

  const {
    targetRef: typeRef,
    componentVisible: isTypeOpen,
    setComponentVisible: setTypeOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: locationRef,
    componentVisible: isLocationOpen,
    setComponentVisible: setLocationOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const toggleType = () => setTypeOpen(!isTypeOpen);
  const toggleLocation = () => setLocationOpen(!isLocationOpen);
  const changeSearchKeyword = (e: React.ChangeEvent<HTMLInputElement>) =>
    setSearchKeyword(e.target.value);

  const typeDropdown = (
    <div
      className={`${
        isTypeOpen ? 'grid-rows-1 opacity-100' : 'grid-rows-0 opacity-0'
      } absolute top-80px grid w-full grid-cols-1 overflow-hidden rounded-sm border border-white bg-landing-page-black3 shadow-job backdrop-blur-md transition-all duration-300 ease-in-out`}
    >
      <div className="flex flex-col">
        {typeOptions.map((type) => (
          <button
            type="button"
            key={type}
            onClick={() => {
              setSelectedType(type);
              setTypeOpen(false);
            }}
            className="px-24px py-8px text-left hover:text-landing-page-orange"
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  );

  const locationDropdown = (
    <div
      className={`${
        isLocationOpen ? 'grid-rows-1 opacity-100' : 'grid-rows-0 opacity-0'
      } absolute top-80px grid w-full grid-cols-1 overflow-hidden rounded-sm border border-white bg-landing-page-black3 shadow-job backdrop-blur-md transition-all duration-300 ease-in-out`}
    >
      <div className="flex flex-col">
        {locationOptions.map((location) => (
          <button
            type="button"
            key={location}
            onClick={() => {
              setSelectedLocation(location);
              setLocationOpen(false);
            }}
            className="px-24px py-8px text-left hover:text-landing-page-orange"
          >
            {location}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex items-center gap-lv-7">
      {/* deprecated: (20250401 - Julian) For debug */}
      <div className="absolute top-450px flex items-center gap-20px">
        Filter:
        <p className="text-lime-300">{selectedType !== 'All' ? `Type: ${selectedType}` : ''}</p>
        <p className="text-rose-300">
          {selectedLocation !== 'All' ? `Location: ${selectedLocation}` : ''}
        </p>
        <p className="text-amber-300">{searchKeyword ? `Keyword: ${searchKeyword}` : ''}</p>
      </div>

      {/* Info: (20250401 - Julian) Type */}
      <div ref={typeRef} className="relative text-base font-bold">
        <button
          type="button"
          className="relative flex h-60px w-200px items-center gap-8px rounded-sm border border-white bg-landing-page-black3 px-24px shadow-job backdrop-blur-md hover:border-landing-page-orange hover:text-landing-page-orange"
          onClick={toggleType}
        >
          <p className="flex-1 text-left">{selectedType}</p>
          <FaChevronDown
            size={16}
            className={`${isTypeOpen ? 'rotate-180' : 'rotate-0'} transition-all duration-300 ease-in-out`}
          />
        </button>

        {typeDropdown}
      </div>

      {/* Info: (20250401 - Julian) Location */}
      <div ref={locationRef} className="relative text-base font-bold">
        <button
          type="button"
          className="relative flex h-60px w-200px items-center gap-8px rounded-sm border border-white bg-landing-page-black3 px-24px shadow-job backdrop-blur-md hover:border-landing-page-orange hover:text-landing-page-orange"
          onClick={toggleLocation}
        >
          <div className="flex flex-1 items-center gap-8px text-left">
            <Image src="/icons/location_pin.svg" alt="Location_Pin" width={20} height={20} />
            <p>{selectedLocation === 'All' ? 'Location' : selectedLocation}</p>
          </div>

          <FaChevronDown
            size={16}
            className={`${isLocationOpen ? 'rotate-180' : 'rotate-0'} transition-all duration-300 ease-in-out`}
          />
        </button>

        {locationDropdown}
      </div>

      {/* Info: (20250401 - Julian) Search bar */}
      <div className="flex h-60px flex-1 items-center rounded-full border border-white bg-landing-page-black3 px-24px shadow-job backdrop-blur-md">
        <input
          type="text"
          className="flex-1 bg-transparent outline-none placeholder:text-landing-page-gray placeholder:opacity-50"
          placeholder="Job title, location, key words"
          value={searchKeyword}
          onChange={changeSearchKeyword}
        />
        <FiSearch size={24} />
      </div>
    </div>
  );
};

export default JobFilterSection;
