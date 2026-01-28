'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/i18n/i18n_context';
import LanguageSelector from '@/components/header/language_selector';
import { randomPassword } from '@/lib/utils/common';
import { request } from '@/lib/utils/request';
import { RefreshCw } from 'lucide-react';

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
  const { t } = useTranslation();
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className="w-full rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-3 text-center text-sm font-bold text-white shadow-lg hover:from-orange-500 hover:to-amber-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
    >
      {isSubmitting ? t('setup.saving') : t('setup.save')}
    </button>
  );
}

export default function SetupForm({ envVars }: ISetupFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Info: (20260116 - Luphia) Initialize values state for controlled inputs (to support setting value from Generator)
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    envVars.forEach(v => {
      initial[v.key] = v.defaultValue || '';
    });
    return initial;
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Info: (20260128 - Luphia) Convert FormData to a plain object for JSON body
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, string> = {};
    formData.forEach((value, key) => {
      payload[key] = value.toString();
    });

    try {
      await request('/api/v1/admin/setup', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Info: (20260116 - Luphia) Redirect to login after successful setup
      router.push('/api/v1/auth/login');
    } catch (err) {
      console.error('Setup failed:', err);
      const message = err instanceof Error ? err.message : t('setup.error');
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerate = async (key: string) => {
    let newValue = '';
    if (key === 'DEWT_PRIVATE_KEY_PEM') {
      setIsSubmitting(true); // Info: (20260128 - Luphia) Use isSubmitting for general loading indication
      try {
        const data = await request<{ key: string }>('/api/v1/admin/setup/key');
        newValue = data.key || '';
      } catch (err) {
        console.error('Failed to generate key via API:', err);
        const message = err instanceof Error ? err.message : 'Failed to generate key';
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      newValue = randomPassword();
    }

    if (newValue) {
      setValues(prev => ({ ...prev, [key]: newValue }));
    }
  };

  const isGeneratable = (key: string) => {
    const upperKey = key.toUpperCase();
    return (
      upperKey.includes('SECRET') ||
      upperKey.includes('PASSWORD') ||
      upperKey.includes('KEY') ||
      upperKey === 'DEWT_PRIVATE_KEY_PEM'
    ) && !upperKey.includes('PUBLIC');
  };

  return (
    <div className="space-y-6">
      {/* Info: (20260116 - Luphia) UI Enhancements: Language Selector and Titles inside Client Component for translation */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-full flex justify-end mb-4">
          <LanguageSelector />
        </div>
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-orange-700 via-orange-500 to-amber-400 mb-2">
          {t('setup.title')}
        </h1>
        <p className="text-gray-600 text-center">{t('setup.description')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-left">
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-600 ring-1 ring-inset ring-red-200">
            {error}
          </div>
        )}

        {envVars.map((item) => (
          <div
            key={item.key}
            className="group space-y-2 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200 transition-all hover:ring-gray-300 hover:shadow-sm"
          >
            <div className="flex justify-between items-start">
              <label
                htmlFor={item.key}
                className="block text-sm font-medium leading-6 text-gray-900 font-mono"
              >
                {item.key}
                {item.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {isGeneratable(item.key) && (
                <button
                  type="button"
                  onClick={() => handleGenerate(item.key)}
                  className="text-xs flex items-center gap-1 text-orange-600 hover:text-orange-500 transition-colors bg-white px-2 py-1 rounded shadow-sm ring-1 ring-gray-200 hover:ring-orange-200"
                >
                  <RefreshCw size={12} />
                  {t('setup.generate')}
                </button>
              )}
            </div>

            {item.description.length > 0 && (
              <div className="text-xs text-gray-500 mb-2">
                {item.description.map((desc, i) => (
                  <p key={i}>{desc.replace(/^#\s*/, '')}</p>
                ))}
              </div>
            )}

            <div className="relative mt-2">
              <input
                id={item.key}
                name={item.key}
                type="text"
                aria-label={item.key}
                value={values[item.key]}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [item.key]: e.target.value }))
                }
                className="block w-full rounded-md border-0 bg-white py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-orange-600 sm:text-sm sm:leading-6 font-mono transition-shadow"
                placeholder={item.defaultValue || ''}
              />
            </div>
          </div>
        ))}

        <div className="pt-6 border-t border-gray-200">
          <SubmitButton isSubmitting={isSubmitting} />
        </div>
      </form>
    </div>
  );
}
