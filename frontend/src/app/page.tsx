import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Button, Icon } from '@/lib/ui';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Section } from '@/components/landing/Section';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: `${SITE.title}: проверка контрольных по скану бланка`,
  description: SITE.description,
  keywords: [
    'платформа тестирования для школы',
    'конструктор тестов для учителя',
    'проверка контрольных работ',
    'бланки ответов',
    'распознавание бланков',
    'электронный журнал оценок',
  ],
  alternates: { canonical: SITE.url },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
};

const STEPS = [
  {
    icon: 'clipboard',
    title: 'Соберите работу',
    text: 'Задания четырёх типов, формулы прямо в тексте, картинки и чертежи. До четырёх вариантов — соседям по парте достанутся разные.',
  },
  {
    icon: 'printer',
    title: 'Распечатайте комплекты',
    text: 'На каждого ученика: лист с заданиями его варианта, бланк ответов с фамилией и лист под развёрнутый ответ. Пачку из принтера остаётся разложить по партам.',
  },
  {
    icon: 'scan',
    title: 'Отсканируйте написанное',
    text: 'Листы загружаются пачкой и сами находят своих учеников: в углу бланка напечатан код работы.',
  },
  {
    icon: 'award',
    title: 'Получите оценки',
    text: 'Закрытые задания проверены, развёрнутые — перед вами со сканом рядом. Оценка считается по вашей шкале и уходит в журнал.',
  },
];

const FEATURES = [
  {
    icon: 'sigma',
    title: 'Формулы как в учебнике',
    text: 'Дроби, корни, системы, интегралы — больше сотни заготовок по разделам. Формула правится прямо в тексте задания и одинаково выглядит на бланке.',
  },
  {
    icon: 'checkCircle',
    title: 'Проверка без ручки',
    text: 'Выбор варианта, несколько ответов с частичным зачётом, краткий ответ с допуском для чисел. Что платформа прочитала неуверенно — помечено.',
  },
  {
    icon: 'users',
    title: 'Вся школа в одном месте',
    text: 'Классы и списки учеников общие, тесты — личные, но ими можно поделиться с коллегой. Оценки видит только тот, кто проводил работу.',
  },
  {
    icon: 'barChart',
    title: 'Разбор и журнал',
    text: 'Видно, с каким заданием класс не справился. Журнал по дате, классу и тесту, средний балл, качество знаний и выгрузка в CSV.',
  },
  {
    icon: 'shield',
    title: 'Данные под замком',
    text: 'Школа не видит чужих данных, второй фактор для администраторов, работа по 152-ФЗ. Сканы лежат в закрытом хранилище.',
  },
  {
    icon: 'smartphone',
    title: 'На любом устройстве',
    text: 'Браузер, приложение на телефон и планшет, отдельное приложение для компьютера — всё одно и то же, без переучивания.',
  },
];

const FAQ = [
  {
    q: 'Нужны ли специальные бланки или сканер?',
    a: 'Нет. Бланк печатается на обычном листе A4 на школьном принтере, скан подойдёт с любого МФУ и даже ровное фото. Главное — печатать в масштабе 100% и не обрезать углы: по чёрным меткам платформа находит сетку листа.',
  },
  {
    q: 'Как ученик должен писать?',
    a: 'Печатными буквами и цифрами, по одному знаку в клетке. Это единственное требование, и оно написано прямо на бланке.',
  },
  {
    q: 'А если платформа прочитала неправильно?',
    a: 'Учитель видит скан рядом с разобранными ответами и правит любой из них в один клик. Неуверенно прочитанное помечено, так что глазами нужно пройти лишь по нескольким клеткам.',
  },
  {
    q: 'Что с развёрнутыми ответами?',
    a: 'Их платформа не проверяет — она не притворяется, что понимает сочинение. Для них печатается отдельный лист, а при проверке учитель ставит баллы, видя скан и свой же критерий.',
  },
  {
    q: 'Где хранятся работы учеников?',
    a: 'На сервере платформы, в границах своей школы. Мы обрабатываем данные по поручению школы и только для работы сервиса — подробности в политике обработки персональных данных.',
  },
  {
    q: 'Что будет, когда подписка закончится?',
    a: 'Данные остаются на месте. Кабинет открывает страницу продления, а после оплаты всё возвращается: классы, тесты, работы и журнал.',
  },
];

export default function LandingPage() {
  // Разметка для поисковиков: продукт, цена и вопросы одним куском.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: SITE.name,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web, Windows, macOS, Linux, Android, iOS',
        description: SITE.description,
        url: SITE.url,
        offers: {
          '@type': 'Offer',
          price: '14900',
          priceCurrency: 'RUB',
          description: 'Подписка для школы на 12 месяцев',
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />

      <main>
        <section className="px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 border-b border-line">
          <div className="max-w-5xl mx-auto">
            <Badge variant="accent">14 дней бесплатно</Badge>
            <h1 className="text-4xl sm:text-6xl font-extrabold text-ink tracking-normal mt-5 max-w-3xl leading-[1.05]">
              Контрольные на бумаге.
              <br />
              Проверка — за минуты.
            </h1>
            <p className="text-muted mt-6 text-lg max-w-2xl">
              Учитель собирает работу в конструкторе, печатает бланки и сканирует написанное.
              Закрытые задания платформа проверяет сама и выставляет оценки по школьной шкале.
              Ученики пишут ручкой на бумаге — как и раньше.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-8">
              <Button size="lg" href="/register" iconRight="arrowRight">
                Попробовать бесплатно
              </Button>
              <Button size="lg" variant="secondary" href="/#how">
                Как это работает
              </Button>
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-line border border-line mt-14">
              {[
                ['30 работ', 'проверяются за один прогон сканера'],
                ['4 типа', 'заданий, включая развёрнутые'],
                ['до 4', 'вариантов в одной работе'],
                ['0 ₽', 'за первые две недели'],
              ].map(([value, label]) => (
                <div key={label} className="bg-bg p-5">
                  <dt className="text-2xl font-extrabold text-ink">{value}</dt>
                  <dd className="text-xs text-muted mt-1 leading-snug">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <Section
          id="how"
          eyebrow="Как это работает"
          title="Четыре шага от задания до оценки в журнале"
          subtitle="Бумага остаётся бумагой: платформа берёт на себя то, что учитель делает ручкой по вечерам."
        >
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-px bg-line border border-line">
            {STEPS.map((step, index) => (
              <li key={step.title} className="bg-bg p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 bg-accent text-on-accent flex items-center justify-center font-extrabold">
                    {index + 1}
                  </span>
                  <Icon name={step.icon} size={20} className="text-accent" />
                </div>
                <h3 className="text-lg font-bold text-ink mt-4">{step.title}</h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          id="features"
          eyebrow="Возможности"
          title="Всё, что нужно для контрольной, и ничего лишнего"
          className="border-t border-line"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-line border border-line">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="bg-bg p-6">
                <Icon name={feature.icon} size={22} className="text-accent" />
                <h3 className="text-base font-bold text-ink mt-4">{feature.title}</h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">{feature.text}</p>
              </article>
            ))}
          </div>
        </Section>

        <Section
          id="price"
          eyebrow="Цена"
          title="Одна подписка на всю школу"
          subtitle="Без счёта учителей, классов и учеников: платит школа, пользуются все."
          className="border-t border-line"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-accent bg-surface p-8">
              <div className="ng-label text-accent">Подписка на год</div>
              <div className="flex items-end gap-2 mt-3">
                <span className="text-5xl font-extrabold text-ink">14 900</span>
                <span className="text-xl text-muted mb-1">₽ / год</span>
              </div>
              <p className="text-sm text-muted mt-2">Это 1 240 ₽ в месяц на всю школу.</p>

              <ul className="mt-6 space-y-2.5">
                {[
                  'Сколько угодно учителей, классов и работ',
                  'Автопроверка закрытых заданий по сканам',
                  'Печать бланков и листов с заданиями',
                  'Журнал оценок и выгрузка в CSV',
                  'Приложение для компьютера и телефона',
                  'Обновления и поддержка весь срок',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-ink">
                    <Icon name="check" size={17} className="text-accent shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-3 mt-8">
                <Button size="lg" href="/register" iconRight="arrowRight">
                  Начать бесплатно
                </Button>
                <Button size="lg" variant="secondary" href="/buy">
                  Оплатить сразу
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border border-line bg-surface p-6">
                <h3 className="text-base font-bold text-ink">Сначала две недели</h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">
                  Школа заводится сразу после регистрации и работает полностью: можно провести
                  настоящую контрольную и посмотреть, как платформа читает почерк ваших учеников.
                  Оплата понадобится только к концу срока.
                </p>
              </div>
              <div className="border border-line bg-surface p-6">
                <h3 className="text-base font-bold text-ink">Оплата картой или по счёту</h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">
                  Картой — через ЮKassa, чек приходит на почту. Нужен счёт для бухгалтерии школы —
                  напишите на {SITE.email}, выставим.
                </p>
              </div>
              <div className="border border-line bg-surface p-6">
                <h3 className="text-base font-bold text-ink">Данные никуда не денутся</h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">
                  Если подписку не продлить, кабинет закроется, но классы, тесты, работы и журнал
                  останутся. После оплаты всё вернётся на место.
                </p>
              </div>
            </div>
          </div>
        </Section>

        <Section id="faq" eyebrow="Вопросы" title="О чём спрашивают чаще всего" className="border-t border-line">
          <div className="divide-y divide-line border-y border-line">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                  <h3 className="text-base font-bold text-ink">{item.q}</h3>
                  <Icon
                    name="chevronDown"
                    size={18}
                    className="text-muted shrink-0 transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="text-sm text-muted mt-3 max-w-3xl leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </Section>

        <section className="px-4 sm:px-6 py-20 border-t border-line bg-accent text-on-accent">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-normal">
                Проведите одну контрольную и решите
              </h2>
              <p className="text-on-accent/80 mt-2 max-w-xl">
                Две недели бесплатно, без карты и договора. Регистрация занимает минуту.
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 h-12 px-6 bg-on-accent text-accent font-bold shrink-0"
            >
              Начать бесплатно
              <Icon name="arrowRight" size={18} />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
