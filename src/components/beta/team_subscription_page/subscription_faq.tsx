import Image from 'next/image';
import { useState } from 'react';
import { IoChevronDown, IoChevronUp } from 'react-icons/io5';

interface IFaq {
  id: number;
  question: string;
  answer: string;
}

const FAQS: IFaq[] = [
  {
    id: 1,
    question: 'Who is responsible for team payments?',
    answer:
      'Any user can upgrade their own team to the Professional plan by entering payment information. After upgrading, only owner can manage future payments for the team.',
  },
  {
    id: 2,
    question: 'How do I cancel my paid plan?',
    answer: '??? No answer provided. Please contact support for more information.',
  },
  {
    id: 3,
    question: 'What if more people are added to my team every month?',
    answer: '??? No answer provided. Please contact support for more information.',
  },
  {
    id: 4,
    question: 'Can you send me an invoice?',
    answer: '??? No answer provided. Please contact support for more information.',
  },
  {
    id: 5,
    question: 'What are the payment methods.',
    answer: '??? No answer provided. Please contact support for more information.',
  },
];

const SubscriptionFaq = () => {
  const [isOpen, setIsOpen] = useState<number>();
  const openFaq = (id: number) => setIsOpen(id);
  const closeFaq = () => setIsOpen(undefined);

  return (
    <main>
      <h1 className="text-center text-36px font-bold text-surface-brand-secondary">
        Subscription FAQ
      </h1>

      <section className="flex flex-col">
        {FAQS.map((faq) => (
          <div key={faq.id}>
            <div
              className="flex cursor-pointer items-center gap-16px px-40px py-32px"
              onClick={() => (isOpen === faq.id ? closeFaq() : openFaq(faq.id))}
            >
              <Image
                src={'/icons/bubble_help_icon.svg'}
                alt="Bubble Help Icon"
                width={20}
                height={20}
              />

              <h3
                className={`flex-auto text-2xl font-semibold ${isOpen === faq.id ? 'text-accordion-surface-background-text-title-active' : 'text-accordion-surface-background-text-title'}`}
              >
                {faq.question}
              </h3>

              {isOpen === faq.id ? <IoChevronUp /> : <IoChevronDown />}
            </div>

            {isOpen === faq.id && (
              <p className="px-40px pb-32px text-lg font-normal text-accordion-surface-background-text-paragraph">
                {faq.answer}
              </p>
            )}
          </div>
        ))}
      </section>
    </main>
  );
};

export default SubscriptionFaq;
