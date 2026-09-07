import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Кабинет и служебные разделы поисковику не нужны: за ними всё равно вход.
      disallow: ['/dashboard',
        '/classes',
        '/tests',
        '/assignments',
        '/grades',
        '/works',
        '/admin',
        '/school',
        '/subscription',
        '/setup',
        '/pay',
        '/print',
        '/api',],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
