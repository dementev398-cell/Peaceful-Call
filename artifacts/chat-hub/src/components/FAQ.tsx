import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollReveal } from './ScrollReveal';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useListFaq } from '@workspace/api-client-react';

export function FAQ() {
  const { t, isRtl, language } = useLanguage();
  const { data: faqItems } = useListFaq();

  const lang = language.toLowerCase() as 'ru' | 'en' | 'ar';
  const pick = (map: { ru?: string; en?: string; ar?: string } | undefined, fallback: string) =>
    map?.[lang] || map?.ru || map?.en || map?.ar || fallback;

  const faqs = (faqItems ?? [])
    .map((item) => ({
      q: pick(item.questionI18n, item.question),
      a: pick(item.answerI18n, item.answer),
    }))
    .filter((f) => f.q && f.a);

  if (faqs.length === 0) return null;

  return (
    <section id="faq" className="py-24 md:py-36 bg-background relative overflow-hidden border-y border-border/20" dir="ltr">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.04),transparent_40%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,hsl(var(--primary)/0.03),transparent_40%)] pointer-events-none" />
      
      <div className="container mx-auto px-6 max-w-5xl relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          <div className="lg:col-span-5 lg:sticky lg:top-32" dir={isRtl ? 'rtl' : 'ltr'}>
            <ScrollReveal>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground tracking-tight drop-shadow-sm leading-[1.1]">
                {t('faq.title')}
              </h2>
              <div className="w-20 h-1 bg-gradient-to-r from-primary to-transparent mt-8 rounded-full opacity-80"></div>
            </ScrollReveal>
          </div>

          <div className="lg:col-span-7" dir={isRtl ? 'rtl' : 'ltr'}>
            <Accordion type="single" collapsible className="w-full space-y-4">
              {faqs.map((faq, idx) => (
                <ScrollReveal key={idx} delay={(idx * 100).toString()}>
                  <AccordionItem 
                    value={`item-${idx}`} 
                    className="group border border-border/30 bg-card/20 backdrop-blur-sm rounded-2xl px-5 sm:px-8 data-[state=open]:border-primary/40 data-[state=open]:bg-card/40 data-[state=open]:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.15)] transition-all duration-500 overflow-hidden relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-data-[state=open]:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    
                    <AccordionTrigger className="text-lg sm:text-xl font-serif font-bold text-foreground/80 hover:text-foreground hover:no-underline py-6 text-left leading-snug [&[data-state=open]]:text-primary transition-colors [&>svg]:text-primary [&>svg]:w-5 [&>svg]:h-5 relative z-10">
                      <span className="flex-1 pr-6" dir="auto">{faq.q}</span>
                    </AccordionTrigger>
                    
                    <AccordionContent className="text-muted-foreground text-sm sm:text-base leading-relaxed pb-8 pt-0 font-light relative z-10" dir="auto">
                      <div className="opacity-80 group-data-[state=open]:opacity-100 transition-opacity duration-500 delay-150">
                        {faq.a}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </ScrollReveal>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
