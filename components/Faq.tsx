import { Reveal } from './Reveal';
import s from './Faq.module.css';

/**
 * Questions fréquentes. Construites sur <details>/<summary> :
 * accessibles au clavier et fonctionnelles sans JavaScript.
 */
export function Faq({ items }: { items: readonly { q: string; r: string }[] }) {
  return (
    <div className={s.faq}>
      {items.map((item, i) => (
        <Reveal key={item.q} retard={Math.min(i, 4) * 70}>
          <details className={s.item}>
            <summary className={s.question}>
              <span>{item.q}</span>
              <span className={s.signe} aria-hidden="true" />
            </summary>
            <p className={s.reponse}>{item.r}</p>
          </details>
        </Reveal>
      ))}
    </div>
  );
}
