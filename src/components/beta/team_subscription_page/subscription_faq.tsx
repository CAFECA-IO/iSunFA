import Image from 'next/image';
import { useState } from 'react';
import { IoChevronDown, IoChevronUp } from 'react-icons/io5';
import { useTranslation } from 'next-i18next';

interface IFaq {
  id: number;
  question: string;
  answer: string;
}

const FAQS: IFaq[] = [
  {
    id: 1,
    question: 'FAQ1_QUESTION',
    answer: 'FAQ1_ANSWER',
  },
  {
    id: 2,
    question: 'FAQ2_QUESTION',
    answer: 'FAQ2_ANSWER',
  },
  {
    id: 3,
    question: 'FAQ3_QUESTION',
    answer: 'FAQ3_ANSWER',
  },
  {
    id: 4,
    question: 'FAQ4_QUESTION',
    answer: 'FAQ4_ANSWER',
  },
  {
    id: 5,
    question: 'FAQ5_QUESTION',
    answer: 'FAQ5_ANSWER',
  },
  {
    id: 6,
    question: 'FAQ6_QUESTION',
    answer: 'FAQ6_ANSWER',
  },
];

const SubscriptionFaq = () => {
  const { t } = useTranslation(['subscriptions']);
  const [isOpen, setIsOpen] = useState<number>();
  const openFaq = (id: number) => setIsOpen(id);
  const closeFaq = () => setIsOpen(undefined);

  return (
    <main className="flex flex-col gap-40px">
      <h1 className="text-center text-36px font-bold text-surface-brand-secondary">
        {t('subscriptions:SUBSCRIPTION_FAQ.SUBSCRIPTION_FAQ')}
      </h1>

      <section className="flex flex-col rounded-lg border border-accordion-surface-background-stroke-border bg-accordion-surface-background-primary">
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
                {t(`subscriptions:SUBSCRIPTION_FAQ.${faq.question}`)}
              </h3>

              {isOpen === faq.id ? <IoChevronUp /> : <IoChevronDown />}
            </div>

            <div
              className={`grid overflow-hidden text-lg font-normal ${isOpen === faq.id ? 'grid-rows-1 opacity-100' : 'grid-rows-0 opacity-0'} text-accordion-surface-background-text-paragraph transition-all duration-300 ease-in-out`}
            >
              <p className="px-40px pb-32px">
                {faq.answer ? t(`subscriptions:SUBSCRIPTION_FAQ.${faq.answer}`) : ''}
              </p>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
};

export default SubscriptionFaq;
