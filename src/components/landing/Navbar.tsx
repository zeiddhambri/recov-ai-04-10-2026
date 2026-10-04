import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Search, User, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Accueil', href: '#' },
    { name: 'Services', href: '#features' },
    { name: 'Conseils & pratiques', href: '#problem' },
    { name: 'Publications', href: '#pricing' },
    { name: 'À propos', href: '#about' },
    { name: 'Nous contacter', href: '#contact' },
  ];

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-border'
          : 'bg-white/80 backdrop-blur-sm'
      )}
    >
      <div className="container-atr flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <button className="lg:hidden text-charcoal" aria-label="Menu">
            <Menu size={24} />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <span className="text-crimson text-2xl">✦</span>
            <div className="leading-none">
              <div className="font-serif-display text-2xl text-charcoal tracking-tight">RecovAI</div>
              
            </div>
          </Link>
        </div>

        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-[13px] font-medium text-charcoal hover:text-crimson transition-colors"
            >
              {link.name}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-5">
          <button className="text-charcoal hover:text-crimson transition-colors" aria-label="Recherche">
            <Search size={18} />
          </button>
          <Link
            to="/auth"
            className="hidden sm:flex items-center gap-2 text-[13px] font-medium text-charcoal hover:text-crimson transition-colors border-l border-border pl-5"
          >
            <User size={16} />
            Connexion
          </Link>
          <button className="hidden sm:flex items-center gap-1.5 text-[13px] font-medium text-charcoal border-l border-border pl-5">
            <Globe size={16} />
            FR
          </button>
          <button
            className="lg:hidden text-charcoal"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 bg-white border-b border-border p-6 flex flex-col gap-1 lg:hidden shadow-lg"
          >
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-base font-medium text-charcoal py-3 border-b border-border last:border-0"
              >
                {link.name}
              </a>
            ))}
            <Link
              to="/auth"
              onClick={() => setIsMobileMenuOpen(false)}
              className="btn-crimson mt-4 w-full"
            >
              Se connecter
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
