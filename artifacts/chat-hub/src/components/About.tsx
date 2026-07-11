import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollReveal } from './ScrollReveal';
import { useContentDict } from '@/hooks/use-content';

export function About() {
  const { t, isRtl } = useLanguage();
  const { dict } = useContentDict();

  const logoImg = dict['site.logo'] || '/logo-source.jpg';

  const bullets = [
    t('about.bullet.1'),
    t('about.bullet.2'),
    t('about.bullet.3'),
    t('about.bullet.4'),
  ];

  return (
    <section id="about" className="py-24 md:py-32 bg-background relative overflow-hidden" dir="ltr">
      {/* Dynamic background glow */}
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      
      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-24 items-center">
          <ScrollReveal>
            <div className="relative group max-w-md mx-auto">
              <div className="aspect-[4/5] rounded-[2rem] sm:rounded-[3rem] glass-strong border border-border/40 shadow-2xl overflow-hidden relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent"></div>
                
                <div className="absolute inset-0 flex items-center justify-center p-8 sm:p-12">
                  <div className="w-40 h-40 sm:w-56 sm:h-56 rounded-full border border-primary/30 bg-background/50 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex items-center justify-center p-3 group-hover:scale-105 group-hover:shadow-[0_0_60px_rgba(240,160,32,0.15)] transition-all duration-700 ease-out backdrop-blur-sm">
                    <img src={logoImg} alt="Logo" className="w-full h-full object-cover rounded-full opacity-90" />
                  </div>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -z-10 -bottom-8 -left-8 w-32 h-32 bg-[radial-gradient(circle,hsl(var(--primary)/0.4)_2px,transparent_2px)] [background-size:16px_16px] opacity-60"></div>
              <div className="absolute -z-10 -top-8 -right-8 w-32 h-32 bg-[radial-gradient(circle,hsl(var(--primary)/0.4)_2px,transparent_2px)] [background-size:16px_16px] opacity-60"></div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay="100">
            <div dir={isRtl ? 'rtl' : 'ltr'}>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-8 tracking-tight drop-shadow-sm">
                {t('about.title')}
              </h2>
              <div className={`w-20 h-1 bg-gradient-to-r from-primary to-transparent mb-10 rounded-full ${isRtl ? 'ml-auto' : ''}`}></div>
              
              <p className="text-lg sm:text-xl text-foreground/80 leading-relaxed mb-12 font-serif font-light drop-shadow-sm">
                {t('about.desc')}
              </p>

              <ul className="space-y-6 mb-14">
                {bullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-4 group/item">
                    <div className="mt-1 w-8 h-8 rounded-full glass border border-primary/20 flex items-center justify-center flex-shrink-0 shadow-sm group-hover/item:border-primary/50 group-hover/item:shadow-[0_0_15px_rgba(240,160,32,0.2)] transition-all duration-300">
                      <div className="w-2 h-2 bg-primary rounded-full group-hover/item:scale-125 transition-transform duration-300"></div>
                    </div>
                    <span className="text-base sm:text-lg text-muted-foreground group-hover/item:text-foreground transition-colors duration-300 leading-relaxed pt-0.5">{bullet}</span>
                  </li>
                ))}
              </ul>

              <div className={`p-6 sm:p-8 glass-strong shadow-lg relative overflow-hidden ${isRtl ? 'border-r-4 border-r-primary rounded-l-3xl' : 'border-l-4 border-l-primary rounded-r-3xl'}`}>
                <div className={`absolute top-0 p-4 opacity-5 ${isRtl ? 'left-0' : 'right-0'}`}>
                  <div className="w-24 h-24 border-4 border-primary rounded-full blur-[2px]"></div>
                </div>
                <p className="text-xl sm:text-2xl font-serif italic text-foreground leading-snug relative z-10">
                  {t('about.closing')}
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
