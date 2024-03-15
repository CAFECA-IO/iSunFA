/* eslint-disable */
import React from 'react';

interface CardProps {
  title: string;
  content: string;
}

const Card = ({ title, content }: CardProps) => {
  return (
    <div className="bg-transparent w-screen h-450px flex items-center pl-20 pt-20">
      <div className="bg-transparent rounded-lg p-6 m-2 h-450px">
        <div className="max-w-md flex flex-col space-y-5">
          <p className="text-h4 leading-h4 lg:text-h4 text-primaryYellow lg:leading-h4">{title}</p>
          <p className="text-white text-base">{content}</p>
        </div>
      </div>
    </div>
  );
};

export default Card;
