import { PageTransition } from '@/components/PageTransition';
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useGetMe } from "@workspace/api-client-react";
import { Shield, MessageCircle, Settings, Users, ArrowRight, BookOpen, ScrollText } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";

export default function PortalPage() {
  const { user } = useAuth();
  const { data: admin } = useGetMe();
  const { t, isRtl } = useLanguage();

  const firstName = user?.name?.trim().split(' ')[0] || '';
  const greeting = firstName ? `${t('portal.greeting')}, ${firstName}` : t('portal.greeting');

  const cards = [
    {
      href: '/messages',
      icon: MessageCircle,
      title: t('portal.messages'),
      desc: t('portal.messagesDesc'),
      cta: t('portal.openChat'),
      delay: '100',
    },
    {
      href: '/admins',
      icon: Users,
      title: t('portal.team'),
      desc: t('portal.teamDesc'),
      cta: t('portal.goto'),
      delay: '200',
    },
    {
      href: '/posts',
      icon: BookOpen,
      title: t('nav.posts'),
      desc: t('posts.subtitle'),
      cta: t('portal.open'),
      delay: '250',
    },
    {
      href: '/hadiths',
      icon: ScrollText,
      title: t('nav.hadiths'),
      desc: t('hadiths.subtitle'),
      cta: t('portal.open'),
      delay: '270',
    },
    {
      href: '/profile',
      icon: Settings,
      title: t('portal.settings'),
      desc: t('portal.settingsDesc'),
      cta: t('portal.open'),
      delay: '300',
    },
  ];

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background selection:bg-primary/30 selection:text-foreground gradient-bg">
      <Navbar />

      <main className="flex-grow container mx-auto px-6 pt-32 pb-24 max-w-5xl">
        <ScrollReveal>
          <div className="mb-16" dir={isRtl ? 'rtl' : 'ltr'}>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
              {greeting}
            </h1>
            <p className="text-xl text-muted-foreground font-serif">
              {t('portal.subtitle')}
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <ScrollReveal key={card.href} delay={card.delay}>
                <Link href={card.href} className="block h-full">
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="glass rounded-[2rem] p-8 h-full flex flex-col border border-border/30 hover:border-primary/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 group"
                    dir={isRtl ? 'rtl' : 'ltr'}
                  >
                    <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-serif font-bold mb-3 group-hover:text-primary transition-colors">
                      {card.title}
                    </h2>
                    <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                      {card.desc}
                    </p>
                    <div className="mt-auto flex items-center text-sm font-bold text-primary uppercase tracking-wider gap-2">
                      {card.cta}
                      <ArrowRight className={`w-4 h-4 opacity-0 transition-all duration-300 ${isRtl ? 'translate-x-2 group-hover:-translate-x-0 rotate-180' : '-translate-x-2 group-hover:translate-x-0'}`} />
                    </div>
                  </motion.div>
                </Link>
              </ScrollReveal>
            );
          })}

          {admin && (
            <ScrollReveal delay="400">
              <Link href="/admin" className="block h-full">
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="bg-primary rounded-[2rem] p-8 h-full flex flex-col border border-primary/50 hover:brightness-110 transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 group text-primary-foreground glow-gold"
                  dir={isRtl ? 'rtl' : 'ltr'}
                >
                  <div className="w-14 h-14 rounded-full bg-background/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold mb-3">
                    {t('portal.admin')}
                  </h2>
                  <p className="text-primary-foreground/80 mb-8 text-sm leading-relaxed">
                    {t('portal.adminDesc')}
                  </p>
                  <div className="mt-auto flex items-center text-sm font-bold uppercase tracking-wider gap-2">
                    {t('portal.manage')}
                    <ArrowRight className={`w-4 h-4 opacity-0 transition-all duration-300 ${isRtl ? 'translate-x-2 group-hover:-translate-x-0 rotate-180' : '-translate-x-2 group-hover:translate-x-0'}`} />
                  </div>
                </motion.div>
              </Link>
            </ScrollReveal>
          )}
        </div>
      </main>

      <Footer />
    </PageTransition>
  );
}
