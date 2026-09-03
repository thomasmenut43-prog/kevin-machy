import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export const dynamic = 'force-static';

const PAGES: { chemin: string; priorite: number }[] = [
  { chemin: '/', priorite: 1 },
  { chemin: '/mariage/', priorite: 0.9 },
  { chemin: '/portrait/', priorite: 0.9 },
  { chemin: '/studio-de-l-iris/', priorite: 0.8 },
  { chemin: '/a-propos/', priorite: 0.6 },
  { chemin: '/contact/', priorite: 0.7 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const date = new Date();
  return PAGES.map((p) => ({
    url: `${SITE.url}${p.chemin}`,
    lastModified: date,
    changeFrequency: 'monthly',
    priority: p.priorite,
  }));
}
