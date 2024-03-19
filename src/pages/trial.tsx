import * as React from 'react';

interface AccuracyProps {
  imageUrl: string;
  title: string;
  description: string;
}

function AccuracyItem({ imageUrl, title, description }: AccuracyProps) {
  return (
    <div className="w-960px relative flex max-w-full gap-0 px-5 max-md:flex-wrap">
      <div className="flex flex-col">
        <div className="h-7 w-7 shrink-0 rounded-full border-5px border-solid border-tertiaryBlue bg-primaryYellow" />
        <div className="h-236px w-5px shrink-0 self-center bg-tertiaryBlue" />
      </div>
      <div className="flex flex-col justify-center self-start">
        <img src={imageUrl} alt="" className="aspect-1.79 w-full" />
      </div>
      <div className="my-auto flex flex-col pl-3 max-md:max-w-full">
        <h3 className="text-center text-2xl font-semibold leading-8 tracking-tight text-primaryYellow max-md:max-w-full">
          {title}
        </h3>
        <p className="mt-1 text-base leading-6 tracking-normal text-white max-md:max-w-full">
          {description}
        </p>
      </div>
    </div>
  );
}

function AccuracySection() {
  const accuracyItems = [
    {
      imageUrl:
        'https://cdn.builder.io/api/v1/image/assets/TEMP/1e50f4e528439cf24a25e6bb5daf2c9fa65fb009bb2c483418c56aa466308c54?apiKey=0e17b0b875f041659e186639705112b1&',
      title: 'Accuracy',
      description:
        'It automates financial tasks like matching certificates and data, checking reports and tax data, saving time and money on regulatory and tax work.',
    },
    // Add more accuracy items here as needed
  ];

  return (
    <section>
      {accuracyItems.map((item, index) => (
        <AccuracyItem
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          imageUrl={item.imageUrl}
          title={item.title}
          description={item.description}
        />
      ))}
    </section>
  );
}

export default AccuracySection;
