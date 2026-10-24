'use client';

/**
 * src/composants/Liseuse.tsx
 * Zakali Press — lire un volume sans quitter le site.
 *
 * Le volume est un site HTML fabrique par l'atelier : ses pages appellent
 * leurs images et leurs feuilles en relatif, et doivent etre servies telles
 * quelles par la porte (regle 8.4). La liseuse les montre donc dans un cadre,
 * sous l'en-tete du site, avec une barre de lecture au-dessus.
 *
 * Le cadre est de la meme origine que la page : la liseuse lit l'adresse ou
 * il se trouve, et tient a jour l'adresse de la page et le selecteur quand le
 * lecteur navigue par les liens du livre. Recharger ou partager l'adresse
 * ramene au meme chapitre.
 *
 * Un chapitre reserve demande depuis le cadre fait sortir la fenetre entiere
 * vers sa page (voir `porte/page-reservee.ts`) : le refus n'est jamais
 * enferme dans le cadre.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Langue } from '@/i18n/langues';
import { cheminDeLecture } from '@/i18n/segments';
import { traducteur } from '@/i18n/traduire';

export type ChapitreDeLiseuse = { titre: string; contenu: string; offert: boolean };

type Proprietes = {
  langue: Langue;
  slug: string;
  titreDuVolume: string;
  fiche: string;
  sommaire: string;
  chapitres: ChapitreDeLiseuse[];
  /** Le rang du chapitre ouvert, a partir de 1, ou `null` pour le sommaire. */
  rangInitial: number | null;
  /**
   * Le nom de base d'une figure du chapitre : la page s'y rend et ouvre sa
   * video. C'est ou menent les liens des extraits PDF (regle 6.5).
   */
  figure: string | null;
  /** L'extrait PDF gratuit du volume, s'il y en a un. */
  extrait: { href: string; nom: string } | null;
};

export default function Liseuse({
  langue,
  slug,
  titreDuVolume,
  fiche,
  sommaire,
  chapitres,
  rangInitial,
  figure,
  extrait,
}: Proprietes) {
  const t = traducteur(langue);
  const cadre = useRef<HTMLIFrameElement>(null);
  const [rang, setRang] = useState<number>(rangInitial ?? 0);
  // La source n'est posee qu'une fois : ensuite c'est le cadre qui navigue.
  //
  // Une figure s'ouvre par l'ancre `#<nom de base>` : c'est le mecanisme des
  // pages de l'atelier elles-memes, qui defilent jusqu'a la figure et ouvrent
  // sa video. La liseuse ne fait que le leur demander.
  const [source] = useState(
    rangInitial
      ? `${chapitres[rangInitial - 1].contenu}${figure ? `#${encodeURIComponent(figure)}` : ''}`
      : sommaire,
  );

  /** Le cadre a change de page : l'adresse et le selecteur suivent. */
  const auChargement = useCallback(() => {
    let chemin: string;
    try {
      chemin = cadre.current?.contentWindow?.location.pathname ?? '';
    } catch {
      return; // une autre origine : rien a lire, rien a suivre
    }
    const place = chapitres.findIndex((c) => c.contenu === chemin);
    const nouveau = place >= 0 ? place + 1 : 0;
    setRang(nouveau);
    window.history.replaceState(null, '', cheminDeLecture(langue, slug, nouveau || undefined));
  }, [chapitres, langue, slug]);

  // Le cadre peut avoir fini de charger AVANT que React n'y branche son
  // ecouteur : la page arrive rendue du serveur, le cadre part aussitot, et
  // l'evenement est perdu. On rattrape ce cas une fois, au montage.
  useEffect(() => {
    const document = cadre.current?.contentDocument;
    if (document?.readyState === 'complete' && document.location.href !== 'about:blank') {
      auChargement();
    }
  }, [auChargement]);

  const allerA = (choix: number) => {
    const chapitre = choix ? chapitres[choix - 1] : null;
    // Le reserve s'explique sur une page entiere, hors du cadre.
    if (chapitre && !chapitre.offert) {
      window.location.assign(cheminDeLecture(langue, slug, choix));
      return;
    }
    setRang(choix);
    cadre.current?.contentWindow?.location.replace(chapitre ? chapitre.contenu : sommaire);
  };

  return (
    <div className="liseuse">
      <div className="liseuse-barre">
        <a className="liseuse-retour" href={fiche}>
          <span aria-hidden="true">←</span> {titreDuVolume}
        </a>

        {extrait && (
          <a className="liseuse-extrait" href={extrait.href} download={extrait.nom}>
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('liseuse.extrait')}
          </a>
        )}

        <label className="liseuse-choix">
          <span className="visuellement-cache">{t('liseuse.choisir')}</span>
          <select value={rang} onChange={(evenement) => allerA(Number(evenement.target.value))}>
            <option value={0}>{t('liseuse.sommaire')}</option>
            {chapitres.map((chapitre, place) => (
              <option key={chapitre.contenu} value={place + 1}>
                {chapitre.offert ? chapitre.titre : `${chapitre.titre} — ${t('fiche.reserve')}`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <iframe
        ref={cadre}
        className="liseuse-cadre"
        src={source}
        title={t('liseuse.cadre', { titre: titreDuVolume })}
        onLoad={auChargement}
      />
    </div>
  );
}
