'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { sendContact } from '@/lib/api/contact';
import { ApiClientError } from '@/lib/api/client';
import { useToastStore } from '@/stores/toastStore';

const schema = z.object({
  subject: z
    .string()
    .min(1, '件名を入力してください')
    .max(100, '件名は100文字以内で入力してください'),
  body: z
    .string()
    .min(1, '本文を入力してください')
    .max(2000, '本文は2000文字以内で入力してください'),
});

type FormValues = z.infer<typeof schema>;

const ContactPage = () => {
  const addToast = useToastStore((s) => s.add);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { subject: '', body: '' },
  });

  const subjectValue = watch('subject');
  const bodyValue = watch('body');

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await sendContact(values.subject, values.body);
      addToast('success', 'お問い合わせを送信しました');
      reset();
    } catch (e) {
      const msg =
        e instanceof ApiClientError ? e.error.message : 'お問い合わせの送信に失敗しました';
      addToast('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">お問い合わせ</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* 件名 */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              件名
            </label>
            <span className="text-xs text-gray-400 dark:text-gray-500">{subjectValue.length} / 100</span>
          </div>
          <input
            {...register('subject')}
            type="text"
            placeholder="例: ログインできない"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.subject && (
            <p className="mt-1 text-xs text-red-500">{errors.subject.message}</p>
          )}
        </div>

        {/* 本文 */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              本文
            </label>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {bodyValue.length} / 2000
            </span>
          </div>
          <textarea
            {...register('body')}
            rows={10}
            placeholder="お問い合わせ内容を入力してください"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
          {errors.body && (
            <p className="mt-1 text-xs text-red-500">{errors.body.message}</p>
          )}
        </div>

        {/* 送信ボタン */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isSubmitting ? '送信中...' : '送信する'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContactPage;
