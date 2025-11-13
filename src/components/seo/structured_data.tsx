import Script from 'next/script';

interface IStructuredDataProps {
  name: string;
  description: string;
}

export default function StructuredData({ name, description }: IStructuredDataProps) {
  const productSchema = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name,
    description,
  };

  return (
    <Script
      id="structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
    />
  );
}
