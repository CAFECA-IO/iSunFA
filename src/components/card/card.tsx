import React from 'react';

interface CardProps {
  title: string;
  content: string;
}

const Card = ({ title, content }: CardProps) => {
  return (
    <div className="flex h-450px w-350px items-center bg-transparent px-10 pt-20 md:w-700px md:px-20 lg:w-screen">
      <div className="h-450px rounded-lg bg-transparent p-6 md:m-2">
        <div className="flex max-w-md flex-col space-y-5">
          <p className="text-base text-primaryYellow md:text-h4 md:leading-h4 lg:text-h4 lg:leading-h4">
            {title}
          </p>
          <p className="text-xs text-white md:text-base">{content}</p>
        </div>
      </div>
    </div>
  );
};

export default Card;
