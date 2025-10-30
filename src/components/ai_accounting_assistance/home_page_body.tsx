import React from 'react';
import AAALayout from '@/components/ai_accounting_assistance/layout';
import { Button } from '@/components/button/button';

const AAAHomePageBody: React.FC = () => {
  return (
    <AAALayout>
      {/* Info: (20251014 - Julian) Chat Main */}
      <div className="flex flex-col items-center gap-16px">
        <h2 className="text-36px font-semibold text-text-brand-primary-lv1">
          Welcome! Ready to upload your certificates?
        </h2>
        <div className="flex items-center gap-8px">
          <Button type="button" variant="secondaryOutline" className="px-8px py-4px text-xs">
            Show me certificates that need editing
          </Button>
          <Button type="button" variant="secondaryOutline" className="px-8px py-4px text-xs">
            Review today’s uploaded certificates
          </Button>
        </div>
      </div>
      {/* Info: (20251014 - Julian) Chat Input */}
      <div className="flex flex-col items-center">
        <div>Upload a certificate or say something to start</div>
        <p className="text-sm font-medium text-input-text-secondary">
          AI may make mistakes. Please verify important information.
        </p>
      </div>
    </AAALayout>
  );
};

export default AAAHomePageBody;
