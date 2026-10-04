import { Linkedin, Twitter, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-charcoal pt-20 pb-10 text-white">
      <div className="container-atr">
        <div className="grid lg:grid-cols-12 gap-12 mb-16">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-crimson text-2xl">✦</span>
              <div className="leading-none">
                <div className="font-serif-display text-2xl text-white">RecovAI</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 -mt-0.5">Collections</div>
              </div>
            </div>
            <p className="text-white/60 text-[14px] leading-relaxed font-light max-w-md mb-8">
              Plateforme SaaS de pilotage du recouvrement bancaire en Tunisie :
              gestion des dossiers, moteur de relance multicanal, scoring de risque,
              suivi contentieux et reporting BCT/CTAF.
            </p>
            <div className="flex gap-3">
              {[Linkedin, Twitter, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center hover:bg-crimson hover:border-crimson transition-colors"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 lg:col-start-6">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-6">Modules</h4>
            <ul className="space-y-3">
              {['Gestion des dossiers', 'Moteur de relance', 'Scoring de risque', 'Reporting BCT'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-white/70 hover:text-crimson transition-colors text-[14px] font-light">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-6">À propos</h4>
            <ul className="space-y-3">
              {['Notre entreprise', 'Conseils & pratiques', 'Publications', 'Carrières'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-white/70 hover:text-crimson transition-colors text-[14px] font-light">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-6">Contact</h4>
            <ul className="space-y-4 text-[14px] font-light">
              <li className="flex gap-3 text-white/70">
                <MapPin size={15} className="text-crimson shrink-0 mt-1" />
                <span>Immeuble Carthage, Les Berges du Lac 1, 1053 Tunis, Tunisie</span>
              </li>
              <li className="flex gap-3 text-white/70">
                <Phone size={15} className="text-crimson shrink-0 mt-1" />
                <span>+216 71 000 000</span>
              </li>
              <li className="flex gap-3 text-white/70">
                <Mail size={15} className="text-crimson shrink-0 mt-1" />
                <span>contact@recovai.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-white/40 font-light">
            © 2026 RecovAI Collections. Tous droits réservés.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-[12px] text-white/40 hover:text-white transition-colors font-light">Confidentialité</a>
            <a href="#" className="text-[12px] text-white/40 hover:text-white transition-colors font-light">Mentions légales</a>
            <a href="#" className="text-[12px] text-white/40 hover:text-white transition-colors font-light">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
