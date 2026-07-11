import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollReveal } from './ScrollReveal';
import { useContentDict } from '@/hooks/use-content';
import { useSendMessage } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, CheckCircle } from 'lucide-react';

export function SupportContact() {
  const { t, isRtl } = useLanguage();
  const { dict } = useContentDict();
  const contactEmail = dict['contact.email'] || 'contact@peacefulcall.org';
  const send = useSendMessage();
  const { toast } = useToast();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ senderName: '', senderEmail: '', subject: '', content: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.senderName || !form.content) {
      toast({ title: 'Please fill in your name and message.', variant: 'destructive' });
      return;
    }
    try {
      await send.mutateAsync({ data: form });
      setSent(true);
      toast({ title: 'Message sent!', description: 'We will reply to you soon.' });
    } catch {
      toast({ title: 'Failed to send', description: 'Please try again.', variant: 'destructive' });
    }
  };

  return (
    <section id="contact" className="py-32 bg-card relative" dir="ltr">
      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          
          <ScrollReveal>
            <div className="bg-background border border-border p-10 md:p-14 rounded-[2rem] h-full flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-500" dir={isRtl ? 'rtl' : 'ltr'}>
              <h3 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
                {t('contact.title')}
              </h3>
              <p className="text-muted-foreground text-lg mb-8 font-light leading-relaxed">
                {t('contact.text')}
              </p>
              
              {sent ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <CheckCircle className="w-16 h-16 text-primary mb-4" />
                  <h4 className="text-xl font-serif font-bold mb-2">Message sent!</h4>
                  <p className="text-muted-foreground">We'll get back to you soon.</p>
                  <Button variant="outline" onClick={() => { setSent(false); setForm({ senderName: '', senderEmail: '', subject: '', content: '' }); }} className="mt-6 rounded-full">
                    Send another
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5 block">Your Name *</label>
                      <Input
                        value={form.senderName}
                        onChange={e => setForm({ ...form, senderName: e.target.value })}
                        placeholder="Ahmad Hassan"
                        className="bg-card border-border/70 focus:border-primary/50 h-11"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5 block">Email</label>
                      <Input
                        type="email"
                        value={form.senderEmail}
                        onChange={e => setForm({ ...form, senderEmail: e.target.value })}
                        placeholder="your@email.com"
                        className="bg-card border-border/70 focus:border-primary/50 h-11"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5 block">Subject</label>
                    <Input
                      value={form.subject}
                      onChange={e => setForm({ ...form, subject: e.target.value })}
                      placeholder="What's on your mind?"
                      className="bg-card border-border/70 focus:border-primary/50 h-11"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5 block">Message *</label>
                    <Textarea
                      value={form.content}
                      onChange={e => setForm({ ...form, content: e.target.value })}
                      placeholder="Write your question or message here..."
                      className="bg-card border-border/70 focus:border-primary/50 min-h-[140px] resize-none"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={send.isPending} className="h-12 rounded-full gap-2 font-semibold tracking-wide mt-2">
                    {send.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {t('contact.button')}
                  </Button>
                </form>
              )}
            </div>
          </ScrollReveal>

          <ScrollReveal delay="100">
            <div className="bg-primary text-primary-foreground p-12 md:p-16 rounded-[2rem] h-full flex flex-col justify-center text-center shadow-lg hover:shadow-xl transition-shadow duration-500 relative overflow-hidden group" dir={isRtl ? 'rtl' : 'ltr'}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]"></div>
              <h3 className="text-3xl md:text-4xl font-serif font-bold mb-6 relative z-10">
                {t('support.title')}
              </h3>
              <p className="text-primary-foreground/90 text-xl mb-12 max-w-sm mx-auto font-light leading-relaxed relative z-10">
                {t('support.text')}
              </p>
              <a 
                href="#donate" 
                className="inline-flex items-center justify-center h-14 px-10 rounded-full bg-background text-foreground font-bold text-sm tracking-widest uppercase hover:bg-background/90 hover:scale-105 transition-all duration-300 mx-auto shadow-md relative z-10"
              >
                {t('support.button')}
              </a>
            </div>
          </ScrollReveal>

        </div>
      </div>
    </section>
  );
}
