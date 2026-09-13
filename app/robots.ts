import type { MetadataRoute } from 'next';
import { lireEntreprise } from '@/lib/entreprise';

export const dynamic = 'force-static';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { url } = await lireEntreprise();
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${url}/sitemap.xml`,
  };
}
