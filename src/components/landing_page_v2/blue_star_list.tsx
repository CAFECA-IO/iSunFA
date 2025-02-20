import React from 'react';

const BlueStarList: React.FC<{ listItem: string[] }> = ({ listItem }) => {
  return (
    <ul className="ml-5 list-outside list-image-blue-star indent-2 leading-44px marker:text-surface-support-strong-baby">
      {listItem.map((item, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
};

export default BlueStarList;
