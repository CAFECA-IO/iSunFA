import * as React from 'react';

interface AccuracyProps {
  imageUrl: string;
  title: string;
  description: string;
}

function AccuracyItem({ imageUrl, title, description }: AccuracyProps) {
  return (
    <div className="flex relative gap-0 px-5 max-w-full w-960px max-md:flex-wrap">
      <div className="flex flex-col">
        <div className="shrink-0 w-7 h-7 bg-amber-400 border-solid border-5px border-slate-600 rounded-full" />
        <div className="shrink-0 self-center bg-slate-600 h-236px w-5px" />
      </div>
      <div className="flex flex-col justify-center self-start">
        <img src={imageUrl} alt="" className="w-full aspect-1.79" />
      </div>
      <div className="flex flex-col pl-3 my-auto max-md:max-w-full">
        <h3 className="text-2xl font-semibold tracking-tight leading-8 text-center text-amber-400 max-md:max-w-full">
          {title}
        </h3>
        <p className="mt-1 text-base tracking-normal leading-6 text-white max-md:max-w-full">
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
