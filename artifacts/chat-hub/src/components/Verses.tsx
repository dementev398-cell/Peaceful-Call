import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollReveal } from './ScrollReveal';

export function Verses() {
  const { t, isRtl } = useLanguage();

  const versesList = [
    { quote: t('verses.1.quote'), cite: t('verses.1.cite') },
    { quote: t('verses.2.quote'), cite: t('verses.2.cite') },
    { quote: t('verses.3.quote'), cite: t('verses.3.cite') },
    { quote: t('verses.4.quote'), cite: t('verses.4.cite') },
  ];

  return (
    <section className="py-24 md:py-32 bg-card/30 border-y border-border/40 relative overflow-hidden" dir="ltr">
      {/* Decorative gradient lines */}
      <div className="absolute left-0 top-0 w-px h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent ml-4 md:ml-8 hidden sm:block"></div>
      <div className="absolute right-0 top-0 w-px h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent mr-4 md:mr-8 hidden sm:block"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>

      <div className="container mx-auto px-6 max-w-5xl relative z-10">
        <ScrollReveal>
          <div className="text-center mb-16 md:mb-24" dir={isRtl ? 'rtl' : 'ltr'}>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground tracking-tight drop-shadow-md">
              {t('verses.title')}
            </h2>
            <div className="w-20 md:w-24 h-1 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mt-6 rounded-full opacity-80"></div>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
          {versesList.map((verse, idx) => (
            <ScrollReveal key={idx} delay={idx % 2 === 0 ? '0' : '100'} className="h-full">
              <div className="h-full group relative" dir={isRtl ? 'rtl' : 'ltr'}>
                <div className="absolute -inset-4 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                <div className={`relative p-8 h-full flex flex-col justify-center ${isRtl ? 'border-r-2 border-r-primary/20 group-hover:border-r-primary rounded-l-3xl' : 'border-l-2 border-l-primary/20 group-hover:border-l-primary rounded-r-3xl'} bg-card/20 hover:bg-card/40 transition-all duration-500 shadow-sm hover:shadow-lg`}>
                  <p className="text-xl md:text-3xl font-serif text-foreground/90 leading-relaxed mb-6 font-light italic drop-shadow-sm group-hover:text-foreground transition-colors">
                    «{verse.quote}»
                  </p>
                  <p className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-[0.25em]">
                    {verse.cite}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
