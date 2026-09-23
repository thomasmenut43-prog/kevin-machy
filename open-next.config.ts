// Adaptation de Next.js pour Cloudflare Workers.
//
// Volontairement nue pour l'instant : on cherche d'abord à savoir si
// l'application peut seulement se construire là-bas. Le cache incrémental sur
// R2 et le reste viendront une fois cette question réglée.
import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig({});
