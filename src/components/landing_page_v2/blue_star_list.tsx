import React from 'react';

const BlueStarList: React.FC<{ listItem: string[] }> = ({ listItem }) => {
  return (
    <ul className="ml-5 list-outside list-image-blue-star leading-44px marker:text-surface-support-strong-baby">
      {listItem.map((item, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <li key={index} className="pl-4px">
          {item}
        </li>
      ))}
    </ul>
  );
};

export default BlueStarList;
