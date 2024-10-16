import Image from 'next/image';

interface MarqueeProps {
  children: React.ReactNode;
}
const Marquee = ({ children }: MarqueeProps) => {
  return (
    <div className="flex gap-16px rounded-md bg-surface-brand-primary-30 px-24px py-16px shadow-Dropshadow_XS">
      <Image src="/icons/announcement.svg" alt="announcement" width={24} height={24}></Image>
      <div className="grow overflow-hidden whitespace-nowrap">
        <div className="flex animate-marquee text-text-brand-secondary-lv1 hover:animate-marqueePaused">
          {children}
        </div>
      </div>
    </div>
  );
};

const Announcement = () => {
  return (
    <Marquee>
      <p>01/10 娛樂稅報繳及各類所得扣繳稅款繳納截止。</p>
      <p>01/15 營業稅報繳及印花稅總繳截止/貨物稅產製廠商報繳貨物稅截止。</p>
    </Marquee>
  );
};

export default Announcement;
