import { useState } from 'react';
import { motion } from 'framer-motion';
import heroImg from '@/assets/hero-recouvrement.jpg';

const tabs = [
  { label: 'Plateforme de pilotage du recouvrement', active: true },
  { label: 'Moteur de relance multicanal', active: false },
  { label: 'Scoring de risque client', active: false },
  { label: 'Reporting BCT & CTAF', active: false },
];

export default function Hero() {
  const [imageSrc, setImageSrc] = useState(heroImg);

  return (
    <section className="relative pt-20 bg-white">
      <div className="relative w-full h-[78vh] min-h-[560px] max-h-[760px] overflow-hidden">
        <img
          src={imageSrc}
          alt="Analyse de portefeuille de créances bancaires"
          width={1920}
          height={1080}
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => {
            // Elegant corporate business planning / banking analytics theme fallback
            setImageSrc("https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1920&q=80");
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />

        <div className="container-atr relative h-full flex items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="max-w-2xl text-white"
          >
            <h1 className="font-serif-display text-4xl md:text-5xl lg:text-[58px] leading-[1.05] tracking-tight mb-6">
              L'intelligence au service du recouvrement
            </h1>
            <p className="text-base md:text-lg text-white/90 max-w-xl leading-relaxed mb-10 font-light">
              La plateforme SaaS qui pilote vos créances classifiées : scoring,
              relances multicanal, suivi contentieux et reporting réglementaire,
              pensée pour les banques et IMF tunisiennes.
            </p>
            <a href="#contact" className="btn-crimson text-[15px] px-8 py-4">
              Demander une démo
            </a>
          </motion.div>
        </div>
      </div>

      <div className="border-b border-border bg-white">
        <div className="container-atr">
          <div className="flex flex-wrap items-stretch gap-x-2 lg:gap-x-12 overflow-x-auto">
            {tabs.map((t, i) => (
              <button
                key={i}
                className={
                  'relative py-6 text-[14px] font-medium whitespace-nowrap transition-colors ' +
                  (t.active ? 'text-charcoal' : 'text-slate hover:text-charcoal')
                }
              >
                {t.label}
                {t.active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-crimson" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
