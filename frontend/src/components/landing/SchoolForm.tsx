'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alert, Button, Checkbox, Input } from '@/lib/ui';

export interface SchoolFormValues {
  schoolName: string;
  city: string;
  lastName: string;
  firstName: string;
  email: string;
  phone: string;
  acceptTerms: boolean;
}

interface Props {
  submitLabel: string;
  busy?: boolean;
  error?: string;
  onSubmit: (values: SchoolFormValues) => void;
}

/**
 * Форма школы: одна и та же для пробного периода и для покупки. Спрашиваем
 * ровно то, без чего нельзя выписать бланк и чек, — ни одного лишнего поля.
 */
export function SchoolForm({ submitLabel, busy = false, error = '', onSubmit }: Props) {
  const [values, setValues] = useState<SchoolFormValues>({
    schoolName: '',
    city: '',
    lastName: '',
    firstName: '',
    email: '',
    phone: '',
    acceptTerms: false,
  });
  const [local, setLocal] = useState('');

  function set<K extends keyof SchoolFormValues>(key: K, value: SchoolFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!values.schoolName.trim() || !values.lastName.trim() || !values.firstName.trim()) {
      setLocal('Заполните название школы, фамилию и имя');
      return;
    }
    if (!values.email.includes('@')) {
      setLocal('Проверьте адрес почты — на него придут чек и напоминания');
      return;
    }
    if (!values.acceptTerms) {
      setLocal('Без согласия с документами продолжить нельзя');
      return;
    }
    setLocal('');
    onSubmit(values);
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      {error || local ? <Alert variant="danger">{error || local}</Alert> : null}

      <Input
        value={values.schoolName}
        onChange={(value) => set('schoolName', value)}
        label="Школа"
        placeholder="МБОУ СОШ № 12"
        icon="school"
        required
      />
      <Input
        value={values.city}
        onChange={(value) => set('city', value)}
        label="Город"
        placeholder="Пенза"
        icon="home"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          value={values.lastName}
          onChange={(value) => set('lastName', value)}
          label="Ваша фамилия"
          placeholder="Наземнова"
          icon="user"
          required
        />
        <Input
          value={values.firstName}
          onChange={(value) => set('firstName', value)}
          label="Имя"
          placeholder="Наталья"
          icon="user"
          required
        />
      </div>

      <Input
        value={values.email}
        onChange={(value) => set('email', value)}
        label="Почта"
        type="email"
        placeholder="director@school12.ru"
        icon="send"
        hint="Сюда придут чек и напоминание о продлении"
        required
      />
      <Input
        value={values.phone}
        onChange={(value) => set('phone', value)}
        label="Телефон"
        placeholder="+7 900 000-00-00"
        icon="smartphone"
      />

      <Checkbox
        checked={values.acceptTerms}
        onChange={(value) => set('acceptTerms', value)}
        ariaLabel="Согласие с документами"
        className="!items-start"
      />
      <label className="-mt-9 pl-8 block text-xs text-muted leading-relaxed">
        Я подтверждаю, что действую с ведома руководства школы, принимаю{' '}
        <Link href="/legal/terms" className="text-accent hover:underline" target="_blank">
          пользовательское соглашение
        </Link>{' '}
        и даю согласие на обработку персональных данных на условиях{' '}
        <Link href="/legal/privacy" className="text-accent hover:underline" target="_blank">
          политики
        </Link>
        .
      </label>

      <Button type="submit" block size="lg" loading={busy} iconRight="arrowRight">
        {submitLabel}
      </Button>
    </form>
  );
}
