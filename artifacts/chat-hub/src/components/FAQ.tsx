import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollReveal } from './ScrollReveal';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useListFaq } from '@workspace/api-client-react';

export function FAQ() {
  const { t, isRtl } = useLanguage();
  const { data: faqItems } = useListFaq();

  const faqs = (faqItems ?? []).map((item) => ({ q: item.question, a: item.answer }));

  // Nothing to show yet — keep the section out of the DOM to avoid an empty card.
  if (faqs.length === 0) return null;

  return (
    <section id="faq" className="py-24 md:py-32 bg-card/30 border-y border-border/40 relative overflow-hidden" dir="ltr">
      {/* Dynamic background glow */}
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="container mx-auto px-6 max-w-4xl relative z-10">
        <ScrollReveal>
          <div className="text-center mb-16 md:mb-20" dir={isRtl ? 'rtl' : 'ltr'}>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground tracking-tight drop-shadow-md">
              {t('faq.title')}
            </h2>
            <div className="w-20 md:w-24 h-1 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mt-6 rounded-full opacity-80"></div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay="100">
          <div className="glass-strong rounded-[2rem] p-6 md:p-10 shadow-2xl border border-border/40" dir={isRtl ? 'rtl' : 'ltr'}>
            <Accordion type="single" collapsible className="w-full space-y-4">
              {faqs.map((faq, idx) => (
                <AccordionItem key={idx} value={`item-${idx}`} className="border border-border/30 bg-card/40 rounded-2xl px-6 data-[state=open]:border-primary/40 data-[state=open]:bg-card/60 transition-all duration-300 shadow-sm hover:shadow-md">
                  <AccordionTrigger className="text-base md:text-lg font-serif font-bold text-foreground/90 hover:text-primary hover:no-underline py-5 text-left leading-snug [&[data-state=open]]:text-primary group">
                    <span className="flex-1 pr-4">{faq.q}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm md:text-base leading-relaxed pb-6 pt-0 font-light">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
