import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollReveal } from './ScrollReveal';

export function Stats() {
  const { t, isRtl } = useLanguage();

  const statsList = [
    { value: '7M+', label: t('stats.views') },
    { value: '700+', label: t('stats.videos') },
    { value: '1000+', label: t('stats.hours') },
    { value: '120+', label: t('stats.faith') },
  ];

  return (
    <section className="py-10 md:py-14 relative bg-background" dir="ltr">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl relative z-10">
        <ScrollReveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-card/70 via-card/40 to-background/60 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] px-6 py-14 md:px-14 md:py-20">
            {/* distinct inner glow so the band reads as its own surface */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08)_0%,transparent_65%)] pointer-events-none" />
            <div className="absolute -top-px left-1/2 -translate-x-1/2 w-2/3 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent pointer-events-none" />

            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-12 md:gap-8 text-center divide-x-0 md:divide-x divide-border/40">
              {statsList.map((stat, idx) => (
                <ScrollReveal key={idx} delay={(idx * 150).toString()}>
                  <div className="flex flex-col items-center justify-center relative group px-2">
                    <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-50 group-hover:scale-125 opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none" />
                    <span className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold mb-4 tracking-tighter text-primary drop-shadow-[0_0_15px_rgba(255,215,0,0.25)] glow-gold-text group-hover:scale-105 transition-transform duration-500">
                      {stat.value}
                    </span>
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground group-hover:text-foreground transition-colors duration-300" dir={isRtl ? 'rtl' : 'ltr'}>
                      {stat.label}
                    </span>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
