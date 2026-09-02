import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-6">
      <div className="max-w-md w-full">
        <div className="w-10 h-1 bg-accent mb-4" />
        <h1 className="text-3xl font-extrabold text-ink">Страница не найдена</h1>
        <p className="text-muted mt-2 text-sm">
          Возможно, её удалили или вы ошиблись адресом. Вернитесь в кабинет и попробуйте снова.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center h-10 px-4 mt-6 bg-accent text-on-accent text-sm font-bold"
        >
          В кабинет
        </Link>
      </div>
    </div>
  );
}
