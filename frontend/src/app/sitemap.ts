import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

/** Карта сайта: в неё идут только страницы, открытые без входа. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE.url, lastModified: now, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE.url}/register`, lastModified: now, changeFrequency: 'yearly', priority: 0.8 },
    { url: `${SITE.url}/buy`, lastModified: now, changeFrequency: 'yearly', priority: 0.7 },
    { url: `${SITE.url}/download`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE.url}/legal/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE.url}/legal/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
