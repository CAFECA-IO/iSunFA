import React from 'react';

interface CardProps {
  title: string;
  content: string;
}

const Card = ({ title, content }: CardProps) => {
  return (
    <div className="flex h-450px w-screen items-center bg-transparent pl-20 pt-20">
      <div className="m-2 h-450px rounded-lg bg-transparent p-6">
        <div className="flex max-w-md flex-col space-y-5">
          <p className="text-h4 leading-h4 text-primaryYellow lg:text-h4 lg:leading-h4">{title}</p>
          <p className="text-base text-white">{content}</p>
        </div>
      </div>
    </div>
  );
};

export default Card;
