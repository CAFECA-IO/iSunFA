'use client';

import { useState } from 'react';

interface IEnvVar {
  key: string;
  defaultValue: string;
  description: string[];
  required: boolean;
}

interface ISetupFormProps {
  envVars: IEnvVar[];
}

function SubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className="w-full rounded-md bg-orange-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isSubmitting ? 'Saving & Restarting...' : 'Save Configuration'}
    </button>
  );
}

export default function SetupForm({ envVars }: ISetupFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch('/api/v1/admin/setup', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      /**
       * Info: (20260116 - Luphia) Refresh headers/cookies or just redirect
       * Since .env is written, server restart might be needed or hot reload.
       * Redirect to home.
       */
      window.location.href = '/';
    } catch (err) {
      console.error(err);
      setError('Failed to save configuration. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left">
      {error && (
        <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-400 ring-1 ring-inset ring-red-500/20">
          {error}
        </div>
      )}

      {envVars.map((item) => (
        <div key={item.key} className="space-y-2">
          {item.description.length > 0 && (
            <div className="mb-2 text-sm text-gray-400">
              {item.description.map((desc, i) => (
                <p key={i}>{desc.replace(/^#\s*/, '')}</p>
              ))}
            </div>
          )}

          <label htmlFor={item.key} className="block text-sm font-medium leading-6 text-white">
            {item.key}
            {item.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="mt-2">
            <input
              id={item.key}
              name={item.key}
              type="text"
              aria-label={item.key}
              defaultValue={item.defaultValue}
              className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-orange-500 sm:text-sm sm:leading-6"
              placeholder={item.defaultValue || ''}
            />
          </div>
        </div>
      ))}

      <div className="pt-8 border-t border-white/10">
        <SubmitButton isSubmitting={isSubmitting} />
      </div>
    </form>
  );
}
