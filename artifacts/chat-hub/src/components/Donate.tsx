import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollReveal } from './ScrollReveal';
import { useContentDict } from '@/hooks/use-content';
import { Heart, ExternalLink, Copy, Check } from 'lucide-react';

export function Donate() {
  const { t, isRtl } = useLanguage();
  const { dict } = useContentDict();
  const [copied, setCopied] = useState(false);

  const qrImage = dict['donation.qr_image'] || '/donate-qr.png';
  const walletNote = dict['donation.wallet_note'] || 'USDT (TRC20)';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletNote);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable; silently ignore.
    }
  };

  return (
    <section id="donate" className="py-24 md:py-32 relative overflow-hidden" dir="ltr">
      <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle,hsl(var(--primary)/0.1),transparent_60%)] blur-3xl pointer-events-none" />

      <div className="container mx-auto px-5 sm:px-6 max-w-4xl relative z-10">
        <div className="glass-strong border border-primary/20 rounded-[3rem] p-8 md:p-16 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent opacity-80 rounded-tl-[3rem]" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-primary/20 to-transparent opacity-80 rounded-br-[3rem]" />

          <ScrollReveal>
            <div className="text-center mb-12 relative z-10" dir={isRtl ? 'rtl' : 'ltr'}>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-[1.5rem] bg-background/50 border border-primary/30 mb-6 shadow-inner glass">
                <Heart className="w-8 h-8 text-primary fill-primary/40 drop-shadow-sm" />
              </div>
              <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground mb-6 drop-shadow-md">
                {t('support.title')}
              </h2>
              <div className="w-20 h-1 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-6 rounded-full opacity-80" />
              <p className="text-lg md:text-xl text-foreground/80 max-w-xl mx-auto font-serif leading-relaxed">
                {t('support.text')}
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay="100">
            <div className="relative z-10 grid md:grid-cols-[auto_1fr] gap-10 md:gap-14 items-center">
              {/* QR Code column */}
              <div className="flex flex-col items-center gap-4 mx-auto md:mx-0">
                <div className="bg-white p-4 rounded-3xl shadow-[0_0_40px_rgba(240,160,32,0.15)] border border-primary/20 relative group">
                  <div className="absolute inset-0 border-2 border-primary/50 rounded-3xl scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-500 pointer-events-none"></div>
                  <img
                    src={qrImage}
                    alt="Donation QR Code"
                    className="w-44 h-44 md:w-52 md:h-52 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <p className="text-[0.65rem] md:text-xs text-muted-foreground uppercase tracking-[0.15em] font-semibold text-center max-w-[12rem]">
                  {t('support.scanHint')}
                </p>
              </div>

              {/* Divider — desktop only */}
              <div className="hidden md:block absolute left-[15.5rem] top-1/2 -translate-y-1/2 h-40 w-px bg-gradient-to-b from-transparent via-primary/25 to-transparent" />

              {/* Actions column */}
              <div className="flex flex-col items-center md:items-start gap-5 text-center md:text-left">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="group flex items-center gap-3 bg-background/80 glass px-6 py-3 rounded-full border border-border/50 shadow-inner hover:border-primary/40 transition-all w-full sm:w-auto justify-center md:justify-start"
                >
                  <span className="font-mono text-sm md:text-base font-semibold text-foreground tracking-widest drop-shadow-sm">
                    {walletNote}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary shrink-0">
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        {t('support.copied')}
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                        {t('support.copyAddress')}
                      </>
                    )}
                  </span>
                </button>

                {/* Primary donation button */}
                <a
                  href="https://new.donatepay.ru/@PeacefulCall"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-5 rounded-full bg-primary text-primary-foreground font-bold text-sm md:text-base uppercase tracking-widest hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all glow-gold shadow-[0_10px_30px_rgba(240,160,32,0.3)] hover:shadow-[0_15px_40px_rgba(240,160,32,0.4)]"
                >
                  <Heart className="w-5 h-5 fill-primary-foreground/60" />
                  {t('support.button')}
                  <ExternalLink className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>

                <p className="text-xs text-primary/70 font-semibold uppercase tracking-[0.2em]">
                  {t('support.accepted')}
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
