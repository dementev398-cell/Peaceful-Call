import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollReveal } from './ScrollReveal';
import { useContentDict } from '@/hooks/use-content';
import { FaYoutube, FaTelegramPlane, FaInstagram, FaTiktok } from 'react-icons/fa';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Heart } from 'lucide-react';
import { useGetMe } from '@workspace/api-client-react';

export function Footer() {
  const { t, isRtl } = useLanguage();
  const { dict } = useContentDict();
  const { isSignedIn } = useAuth();
  const { data: me } = useGetMe();
  const isAdmin = !!me && (me.role === 'owner' || me.role === 'editor');

  const logoImg = dict['site.logo'] || '/logo-source.jpg';
  const siteName = dict['site.name'] || 'Peaceful Call';

  const yt = dict['social.youtube'] || 'https://www.youtube.com/@PeacefulCall';
  const tg = dict['social.telegram'] || 'https://t.me/peacefulcall';
  const ig = dict['social.instagram'] || 'https://www.instagram.com/peacefulcall9?utm_source=qr&igsh=MXh4dDAwZmxrOWF5ag==';
  const tk = dict['social.tiktok'] || 'https://www.tiktok.com/@peacefulcall99';

  const socialItem = (href: string, icon: React.ReactNode, label: string) => {
    const base = 'w-11 h-11 rounded-full border flex items-center justify-center transition-all duration-300 shadow-sm';
    if (href) {
      return (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className={`${base} bg-card border-border/60 text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary hover:scale-105`}
        >
          {icon}
        </a>
      );
    }
    return (
      <span
        key={label}
        aria-label={`${label} (not configured)`}
        title={`${label} — добавьте ссылку в Admin → Контент`}
        className={`${base} bg-card/40 border-border/20 text-muted-foreground/20 cursor-default`}
      >
        {icon}
      </span>
    );
  };

  return (
    <footer className="bg-background border-t border-border/40 pt-18 pb-8 relative overflow-hidden" dir="ltr">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="container mx-auto px-5 sm:px-6 flex flex-col items-center text-center">

        <ScrollReveal>
          <div className="flex flex-col items-center gap-3.5 mb-7">
            <div className="w-11 h-11 rounded-full border border-primary/20 overflow-hidden shadow-sm bg-card flex items-center justify-center p-1">
              <img src={logoImg} alt="Logo" className="w-full h-full object-cover rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <span className="font-serif font-semibold text-xl tracking-wide text-foreground">
              {siteName}
            </span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay="100">
          <p className="text-muted-foreground text-base mb-8 max-w-xs font-serif italic leading-relaxed" dir={isRtl ? 'rtl' : 'ltr'}>
            &ldquo;{t('footer.tagline')}&rdquo;
          </p>
        </ScrollReveal>

        {/* Social icons */}
        <ScrollReveal delay="150">
          <div className="flex gap-3 mb-7">
            {socialItem(yt, <FaYoutube className="w-4.5 h-4.5" />, 'YouTube')}
            {socialItem(tg, <FaTelegramPlane className="w-4.5 h-4.5" />, 'Telegram')}
            {socialItem(ig, <FaInstagram className="w-4.5 h-4.5" />, 'Instagram')}
            {socialItem(tk, <FaTiktok className="w-4.5 h-4.5" />, 'TikTok')}
          </div>
        </ScrollReveal>

        {/* Donation button */}
        <ScrollReveal delay="200">
          <a
            href="https://new.donatepay.ru/@PeacefulCall"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-primary/30 bg-primary/8 text-primary text-sm font-semibold hover:bg-primary/15 hover:border-primary/50 transition-all duration-300 mb-12"
          >
            <Heart className="w-3.5 h-3.5 fill-primary/40" />
            {t('nav.donate')}
          </a>
        </ScrollReveal>

        <div className="w-full flex flex-col sm:flex-row items-center justify-between border-t border-border/40 pt-7 gap-3">
          <p className="text-xs text-muted-foreground/50 tracking-wide">
            {t('footer.copy')}
          </p>

          <div className="flex items-center gap-5">
            {isAdmin ? (
              <Link href="/admin" className="text-xs font-semibold uppercase tracking-widest text-primary/60 hover:text-primary transition-colors">
                {t('nav.admin')}
              </Link>
            ) : isSignedIn ? null : (
              <Link href="/sign-in" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/35 hover:text-muted-foreground transition-colors">
                {t('nav.signin')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
