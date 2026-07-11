import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollReveal } from './ScrollReveal';
import { useContentDict } from '@/hooks/use-content';
import { Heart, ExternalLink, Sparkles } from 'lucide-react';

export function Donate() {
  const { t, isRtl } = useLanguage();
  const { dict } = useContentDict();

  const qrImage = dict['donation.qr_image'] || '/donate-qr.png';

  return (
    <section id="donate" className="py-24 md:py-36 relative overflow-hidden" dir="ltr">
      {/* Deep ambient background layers */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Base radial bloom */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-[radial-gradient(circle,hsl(43_85%_58%/0.12),transparent_55%)] blur-3xl" />
        {/* Secondary cool accent */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,hsl(220_80%_60%/0.05),transparent_60%)] blur-2xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(circle,hsl(43_85%_58%/0.07),transparent_60%)] blur-2xl" />
      </div>

      <div className="container mx-auto px-5 sm:px-6 max-w-5xl relative z-10">
        <ScrollReveal>
          {/* Section eyebrow */}
          <div className="flex flex-col items-center mb-14" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/8 mb-5 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-primary/90">
                {t('support.accepted')}
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground mb-5 text-center drop-shadow-md">
              {t('support.title')}
            </h2>
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent mb-5 rounded-full" />
            <p className="text-base md:text-lg text-foreground/70 max-w-lg text-center font-serif leading-relaxed">
              {t('support.text')}
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay="100">
          {/* Main card — gradient border via layered pseudo approach using box-shadow + padding trick */}
          <div
            className="relative rounded-[2.5rem] p-px overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, hsl(43 85% 58% / 0.5) 0%, hsl(224 24% 20% / 0.3) 40%, hsl(43 85% 58% / 0.35) 100%)',
            }}
          >
            <div className="glass-strong rounded-[calc(2.5rem-1px)] relative overflow-hidden">
              {/* Corner accent ornaments */}
              <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent rounded-tl-[2.5rem] pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-primary/15 via-primary/5 to-transparent rounded-br-[2.5rem] pointer-events-none" />
              {/* Subtle top shimmer line */}
              <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent pointer-events-none" />

              <div className="relative z-10 p-8 md:p-14">
                <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">

                  {/* ── QR Code ── */}
                  <div className="flex flex-col items-center gap-5 flex-shrink-0">
                    {/* Pulsing glow ring behind QR */}
                    <div className="relative">
                      {/* Animated pulse rings */}
                      <div
                        className="absolute inset-0 rounded-[1.75rem] opacity-60"
                        style={{
                          background: 'radial-gradient(circle, hsl(43 85% 58% / 0.25) 0%, transparent 70%)',
                          animation: 'qr-pulse 3s ease-in-out infinite',
                        }}
                      />
                      <div
                        className="absolute -inset-3 rounded-[2rem] opacity-30"
                        style={{
                          background: 'radial-gradient(circle, hsl(43 85% 58% / 0.18) 0%, transparent 70%)',
                          animation: 'qr-pulse 3s ease-in-out infinite 0.5s',
                        }}
                      />
                      {/* QR container */}
                      <div
                        className="relative bg-white p-5 rounded-[1.5rem] shadow-[0_0_60px_rgba(240,160,32,0.2),0_8px_32px_rgba(0,0,0,0.4)] border border-primary/20"
                        style={{ boxShadow: '0 0 0 1px hsl(43 85% 58% / 0.15), 0 0 60px hsl(43 85% 58% / 0.18), 0 8px 32px rgba(0,0,0,0.5)' }}
                      >
                        {/* Gold corner brackets */}
                        <span className="absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 border-primary/60 rounded-tl-md" />
                        <span className="absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 border-primary/60 rounded-tr-md" />
                        <span className="absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 border-primary/60 rounded-bl-md" />
                        <span className="absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 border-primary/60 rounded-br-md" />
                        <img
                          src={qrImage}
                          alt="Donation QR Code"
                          className="w-44 h-44 md:w-52 md:h-52 object-contain relative z-10"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-[0.65rem] text-muted-foreground/80 uppercase tracking-[0.18em] font-semibold text-center max-w-[11rem] leading-snug">
                      {t('support.scanHint')}
                    </p>
                  </div>

                  {/* ── Desktop vertical divider ── */}
                  <div className="hidden md:flex flex-col items-center self-stretch py-4 flex-shrink-0">
                    <div className="flex-1 w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40 my-2" />
                    <div className="flex-1 w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
                  </div>

                  {/* ── Mobile horizontal divider ── */}
                  <div className="md:hidden w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

                  {/* ── Actions column ── */}
                  <div
                    className="flex flex-col items-center md:items-start gap-6 text-center md:text-left flex-1"
                    dir={isRtl ? 'rtl' : 'ltr'}
                  >
                    {/* Icon + heading */}
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center shadow-inner flex-shrink-0">
                        <Heart className="w-5 h-5 text-primary fill-primary/40" />
                      </div>
                      <div>
                        <p className="text-[0.6rem] uppercase tracking-[0.2em] text-primary/70 font-bold mb-0.5">
                          {t('support.accepted')}
                        </p>
                        <p className="text-sm text-foreground/60 font-serif">
                          {t('support.text')}
                        </p>
                      </div>
                    </div>

                    {/* Primary CTA */}
                    <div className="flex flex-col items-center md:items-start gap-2 w-full sm:w-auto">
                      <p className="text-[0.65rem] text-muted-foreground/50 font-medium tracking-wide">
                        {t('support.otherMethods')}
                      </p>
                      <a
                        href="https://new.donatepay.ru/@PeacefulCall"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center justify-center gap-3 px-10 py-4 rounded-full bg-primary text-primary-foreground font-bold text-sm md:text-base uppercase tracking-widest transition-all glow-gold shadow-[0_8px_28px_hsl(43_85%_58%/0.35)] hover:shadow-[0_12px_36px_hsl(43_85%_58%/0.5)] hover:brightness-110 hover:scale-[1.03] active:scale-[0.98] w-full sm:w-auto"
                      >
                        <Heart className="w-4 h-4 fill-current opacity-80" />
                        {t('support.button')}
                        <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </a>
                    </div>

                    {/* Accepted currencies note */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-px bg-gradient-to-r from-primary/40 to-transparent" />
                      <p className="text-[0.65rem] text-primary/60 font-bold uppercase tracking-[0.22em]">
                        {t('support.accepted')}
                      </p>
                      <div className="w-8 h-px bg-gradient-to-l from-primary/40 to-transparent" />
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Keyframe for QR pulse animation */}
      <style>{`
        @keyframes qr-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
      `}</style>
    </section>
  );
}
