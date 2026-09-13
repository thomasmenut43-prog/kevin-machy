'use client';

import { useState } from 'react';
import type { BlocTexte, Fragment, TexteRiche } from '@/lib/texteRiche';
import e from './editeur.module.css';

/**
 * Éditeur de texte riche.
 *
 * Volontairement simple : un bloc par ligne, chaque bloc étant un paragraphe ou
 * une puce, avec gras, italique et lien posés sur le bloc entier.
 *
 * Pourquoi pas une zone `contenteditable` façon traitement de texte : parce
 * qu'elle produit du HTML tapé dans un navigateur, qu'il faudrait alors
 * nettoyer avant de le réafficher, et qu'écrire un nettoyeur HTML sûr est un
 * exercice que presque tout le monde rate. Ici, il n'y a pas de balises à
 * nettoyer. Un `<script>` tapé par mégarde reste le texte « <script> ».
 */
export function EditeurTexteRiche({
  doc,
  onChange,
}: {
  doc?: unknown;
  onChange: (v: TexteRiche) => void;
}) {
  const blocs: BlocTexte[] = Array.isArray(doc) && doc.length ? (doc as BlocTexte[]) : [];
  const [ouvert, setOuvert] = useState<number | null>(null);

  const majBloc = (i: number, bloc: BlocTexte) =>
    onChange(blocs.map((b, n) => (n === i ? bloc : b)));

  const texteDe = (bloc: BlocTexte) => (bloc.fragments ?? []).map((f) => f.texte).join('');

  const poserTexte = (i: number, texte: string) => {
    const bloc = blocs[i];
    const marques = bloc.fragments?.[0] ?? {};
    const fragment: Fragment = {
      texte,
      ...(marques.gras ? { gras: true } : {}),
      ...(marques.italique ? { italique: true } : {}),
      ...(marques.lien ? { lien: marques.lien } : {}),
    };
    majBloc(i, { ...bloc, fragments: [fragment] });
  };

  const basculer = (i: number, marque: 'gras' | 'italique') => {
    const bloc = blocs[i];
    const f = bloc.fragments?.[0] ?? { texte: '' };
    majBloc(i, { ...bloc, fragments: [{ ...f, [marque]: !f[marque] }] });
  };

  const poserLien = (i: number, lien: string) => {
    const bloc = blocs[i];
    const f = bloc.fragments?.[0] ?? { texte: '' };
    const propre = lien.trim();
    majBloc(i, {
      ...bloc,
      fragments: [{ ...f, ...(propre ? { lien: propre } : { lien: undefined }) }],
    });
  };

  const ajouter = (type: BlocTexte['type']) =>
    onChange([...blocs, { type, fragments: [{ texte: '' }] }]);

  return (
    <div className={e.texteRiche}>
      {blocs.map((bloc, i) => {
        const f = bloc.fragments?.[0] ?? { texte: '' };
        return (
          <div key={i} className={e.blocTexte}>
            <div className={e.blocBarre}>
              <select
                value={bloc.type}
                onChange={(ev) => majBloc(i, { ...bloc, type: ev.target.value as BlocTexte['type'] })}
                aria-label="Type de bloc"
              >
                <option value="paragraphe">Paragraphe</option>
                <option value="liste">Puce</option>
                <option value="listeNumerotee">Puce numérotée</option>
              </select>

              <button
                type="button"
                onClick={() => basculer(i, 'gras')}
                aria-pressed={Boolean(f.gras)}
                title="Gras"
              >
                <strong>G</strong>
              </button>
              <button
                type="button"
                onClick={() => basculer(i, 'italique')}
                aria-pressed={Boolean(f.italique)}
                title="Italique"
              >
                <em>I</em>
              </button>
              <button
                type="button"
                onClick={() => setOuvert(ouvert === i ? null : i)}
                aria-pressed={Boolean(f.lien)}
                title="Lien"
              >
                lien
              </button>

              <span className={e.espaceur} />

              <button
                type="button"
                onClick={() => onChange(blocs.filter((_, n) => n !== i))}
                aria-label="Supprimer cette ligne"
              >
                ✕
              </button>
            </div>

            <textarea
              value={texteDe(bloc)}
              onChange={(ev) => poserTexte(i, ev.target.value)}
              rows={bloc.type === 'paragraphe' ? 3 : 1}
            />

            {ouvert === i ? (
              <input
                type="text"
                placeholder="/contact/ ou https://…"
                value={f.lien ?? ''}
                onChange={(ev) => poserLien(i, ev.target.value)}
                aria-label="Destination du lien"
              />
            ) : null}
          </div>
        );
      })}

      <div className={e.ajoutsTexte}>
        <button type="button" className="bo-bouton bo-bouton-discret" onClick={() => ajouter('paragraphe')}>
          Paragraphe
        </button>
        <button type="button" className="bo-bouton bo-bouton-discret" onClick={() => ajouter('liste')}>
          Puce
        </button>
      </div>
    </div>
  );
}
