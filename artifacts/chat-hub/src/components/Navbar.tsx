import { Link, useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { useContentDict } from '@/hooks/use-content';
import { useAuth } from '@/contexts/AuthContext';
import { UserMenu } from './UserMenu';
import { Menu, X, LogOut, BookOpen, ScrollText, Users, HelpCircle, BookMarked } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGetMe } from '@workspace/api-client-react';

export function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { dict } = useContentDict();
  const { isSignedIn, signOut } = useAuth();
  const { data: me } = useGetMe();
  const isAdmin = !!me && (me.role === 'owner' || me.role === 'editor');
  const [location] = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // When we're already on the home page, a wouter <Link> to "/#about" won't
  // trigger a navigation (the path doesn't change), so it wouldn't scroll.
  // Scroll directly in that case; otherwise let the Link navigate to "/"
  // and Home.tsx's mount effect will scroll once the sections are rendered.
  const handleAnchorClick = (id: string) => (e: React.MouseEvent) => {
    if (location === '/') {
      e.preventDefault();
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMenuOpen(false);
    }
  };

  const logoImg = dict['site.logo'] || '/logo-source.jpg';
  const siteName = dict['site.name'] || t('site.name');

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'glass-strong border-b border-border/30 py-2.5'
          : 'bg-transparent py-4'
      }`}
      dir="ltr"
    >
      <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="w-9 h-9 flex items-center justify-center overflow-hidden rounded-full border border-primary/30 group-hover:border-primary/60 transition-all shadow-sm bg-card/50">
            <img src={logoImg} alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-serif font-semibold text-base tracking-wide text-foreground hidden sm:block group-hover:text-primary transition-colors">
            {siteName}
          </span>
        </Link>

        {/* Desktop Nav Links — only shown once there's room for the full row (lg+);
            below that the hamburger menu carries these links so nothing wraps or overflows. */}
        <nav className="hidden lg:flex items-center gap-4 xl:gap-5 min-w-0">
          <Link href="/#about" onClick={handleAnchorClick('about')} className="text-xs font-bold tracking-widest text-muted-foreground hover:text-foreground transition-colors uppercase flex items-center gap-1.5 whitespace-nowrap">
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            {t('nav.about')}
          </Link>
          <Link href="/#faq" onClick={handleAnchorClick('faq')} className="text-xs font-bold tracking-widest text-muted-foreground hover:text-foreground transition-colors uppercase flex items-center gap-1.5 whitespace-nowrap">
            <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {t('nav.faq')}
          </Link>
          <Link href="/posts" className="text-xs font-bold tracking-widest text-muted-foreground hover:text-primary transition-colors uppercase flex items-center gap-1.5 whitespace-nowrap">
            <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
            {t('nav.posts')}
          </Link>
          <Link href="/hadiths" className="text-xs font-bold tracking-widest text-muted-foreground hover:text-primary transition-colors uppercase flex items-center gap-1.5 whitespace-nowrap">
            <ScrollText className="w-3.5 h-3.5 flex-shrink-0" />
            {t('nav.hadiths')}
          </Link>
          <Link href="/quran" className="text-xs font-bold tracking-widest text-muted-foreground hover:text-primary transition-colors uppercase flex items-center gap-1.5 whitespace-nowrap">
            <BookMarked className="w-3.5 h-3.5 flex-shrink-0" />
            {t('nav.quran')}
          </Link>
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Language Switcher */}
          <div className="flex items-center gap-0.5 bg-muted/40 p-1 rounded-full border border-border/40 flex-shrink-0">
            {(['RU', 'EN', 'AR'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`text-xs font-bold px-2 sm:px-2.5 py-1 rounded-full transition-all duration-300 ${
                  language === lang
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          {/* Auth — desktop */}
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            {isSignedIn ? (
              <>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="h-8 px-3 lg:px-4 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-widest uppercase hover:bg-primary/20 transition-all duration-300 inline-flex items-center border border-primary/20 hover:border-primary/40 whitespace-nowrap"
                  >
                    {t('nav.admin')}
                  </Link>
                )}
                <UserMenu />
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="h-8 px-3 lg:px-4 rounded-full border border-primary/50 text-primary text-xs font-bold tracking-widest uppercase hover:bg-primary hover:text-primary-foreground transition-all duration-300 inline-flex items-center whitespace-nowrap"
                >
                  {t('nav.signin')}
                </Link>
                <Link
                  href="/sign-up"
                  className="h-8 px-3 lg:px-4 rounded-full bg-primary text-[hsl(224_24%_4%)] text-xs font-bold tracking-widest uppercase hover:brightness-110 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 inline-flex items-center glow-gold-sm shadow-sm shadow-primary/30 whitespace-nowrap"
                >
                  {t('nav.signup')}
                </Link>
              </>
            )}
          </div>

          {/* Hamburger — shown any time the full desktop nav (lg+) isn't visible */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="lg:hidden absolute top-full left-0 right-0 glass-strong border-b border-border/30 px-5 py-6 flex flex-col gap-2 shadow-2xl origin-top"
          >
            <Link href="/#about" onClick={(e) => { handleAnchorClick('about')(e); setMenuOpen(false); }} className="flex items-center gap-3 text-base font-semibold tracking-widest text-muted-foreground hover:text-foreground transition-colors uppercase py-3 border-b border-border/20">
              <Users className="w-5 h-5 text-muted-foreground" />
              {t('nav.about')}
            </Link>
            <Link href="/#faq" onClick={(e) => { handleAnchorClick('faq')(e); setMenuOpen(false); }} className="flex items-center gap-3 text-base font-semibold tracking-widest text-muted-foreground hover:text-foreground transition-colors uppercase py-3 border-b border-border/20">
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
              {t('nav.faq')}
            </Link>
            <Link href="/posts" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 text-base font-semibold tracking-widest text-muted-foreground hover:text-primary transition-colors uppercase py-3 border-b border-border/20">
              <BookOpen className="w-5 h-5 text-primary/70" />
              {t('nav.posts')}
            </Link>
            <Link href="/hadiths" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 text-base font-semibold tracking-widest text-muted-foreground hover:text-primary transition-colors uppercase py-3 border-b border-border/20">
              <ScrollText className="w-5 h-5 text-primary/70" />
              {t('nav.hadiths')}
            </Link>
            <Link href="/quran" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 text-base font-semibold tracking-widest text-muted-foreground hover:text-primary transition-colors uppercase py-3 border-b border-border/20">
              <BookMarked className="w-5 h-5 text-primary/70" />
              {t('nav.quran')}
            </Link>
            <div className="pt-4">
              {isSignedIn ? (
                <div className="flex flex-col gap-3">
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setMenuOpen(false)} className="w-full inline-flex items-center justify-center h-12 rounded-full bg-primary/10 text-primary text-sm font-bold tracking-widest uppercase border border-primary/20 shadow-inner">
                      {t('nav.admin')}
                    </Link>
                  )}
                  <button
                    onClick={() => { setMenuOpen(false); signOut(); }}
                    className="w-full flex items-center justify-center gap-2 h-12 rounded-full border border-border text-muted-foreground text-sm font-bold uppercase hover:text-destructive hover:border-destructive transition-all hover:bg-destructive/10"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('nav.signout')}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <Link href="/sign-in" onClick={() => setMenuOpen(false)} className="w-full inline-flex items-center justify-center h-12 rounded-full border border-primary/50 text-primary text-sm font-bold tracking-widest uppercase hover:bg-primary/5">
                    {t('nav.signin')}
                  </Link>
                  <Link href="/sign-up" onClick={() => setMenuOpen(false)} className="w-full inline-flex items-center justify-center h-12 rounded-full bg-primary text-[hsl(224_24%_4%)] text-sm font-bold tracking-widest uppercase glow-gold-sm shadow-lg shadow-primary/20 hover:brightness-110 transition-all">
                    {t('nav.signup')}
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
