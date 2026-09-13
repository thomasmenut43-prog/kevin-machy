import { redirect } from 'next/navigation';
import { utilisateurConnecte } from '@/lib/auth';
import { Footer } from '@/components/Footer';
import { lireEntreprise } from '@/lib/entreprise';
import { Apercu } from './Apercu';
// L'aperçu est le seul écran de ce groupe à porter les styles du site.
import '../../(frontend)/globals.css';

export const dynamic = 'force-dynamic';

/** L'aperçu montre des brouillons : il se protège comme le reste du BackOffice. */
export default async function PageApercu() {
  if (!(await utilisateurConnecte())) redirect('/admin/connexion/');
  return <Apercu pied={<Footer entreprise={await lireEntreprise()} />} />;
}
