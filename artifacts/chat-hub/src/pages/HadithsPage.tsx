import { PageTransition } from '@/components/PageTransition';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ScrollReveal } from '@/components/ScrollReveal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useListHadiths, type HadithGrade } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, ScrollText, ArrowRight, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { GRADE_META } from '@/lib/hadithGrades';

type SortMode = 'newest' | 'oldest' | 'alpha';

const LOCALE_TAGS: Record<string, string> = { RU: 'ru', EN: 'en', AR: 'ar' };

export default function HadithsPage() {
  const { t, language } = useLanguage();
  const localeTag = LOCALE_TAGS[language] || 'en';
  const [grade, setGrade] = useState<string>('');
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const { data: allHadiths = [], isLoading } = useListHadiths(
    grade ? { grade: grade as HadithGrade } : undefined
  );

  const hadiths = useMemo(() => {
    let list = allHadiths;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (h) =>
          h.text.toLowerCase().includes(q) ||
          (h.source || '').toLowerCase().includes(q) ||
          (h.topic || '').toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      if (sortMode === 'alpha') return a.text.localeCompare(b.text, localeTag);
      const diff = new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime();
      return sortMode === 'oldest' ? -diff : diff;
    });
    return list;
  }, [allHadiths, query, sortMode, localeTag]);

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background gradient-bg">
      <Navbar />
      <main className="flex-grow pt-28 pb-24">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <ScrollReveal>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold tracking-wider uppercase mb-6">
                <ScrollText className="w-4 h-4" />
                {t('hadiths.title')}
              </div>
              <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground mb-6 leading-tight" dir="auto">
                {t('hadiths.title')}
              </h1>
              <div className="w-20 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 mx-auto mb-6 rounded-full" />
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-serif" dir="auto">
                {t('hadiths.subtitle')}
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay="100">
            <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-card/40 p-2 rounded-3xl sm:rounded-full border border-border/40 shadow-sm glass">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('search.placeholder')}
                  className="w-full h-12 pl-11 pr-4 rounded-full bg-transparent border-none text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 transition-all"
                />
              </div>
              <div className="hidden sm:block w-px h-6 bg-border/50 self-center" />
              <div className="flex gap-2">
                <Select value={sortMode} onValueChange={(val) => setSortMode(val as SortMode)}>
                  <SelectTrigger className="flex-1 sm:w-auto h-12 px-4 rounded-full bg-muted/20 border border-transparent text-sm text-foreground focus:ring-0 focus:ring-offset-0 focus:bg-muted/40 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border/40 bg-card/95 backdrop-blur-xl shadow-xl">
                    <SelectItem value="newest" className="rounded-xl focus:bg-primary/20 focus:text-primary">{t('sort.newest')}</SelectItem>
                    <SelectItem value="oldest" className="rounded-xl focus:bg-primary/20 focus:text-primary">{t('sort.oldest')}</SelectItem>
                    <SelectItem value="alpha" className="rounded-xl focus:bg-primary/20 focus:text-primary">{t('sort.alpha')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay="100">
            <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
              <button
                onClick={() => setGrade('')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition-all ${
                  grade === '' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 text-muted-foreground border-border/40 hover:text-foreground'
                }`}
              >
                {t('hadiths.all')}
              </button>
              {Object.entries(GRADE_META).map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => setGrade(key)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition-all ${
                    grade === key ? meta.className.replace('/10', '/20') + ' !border-current' : 'bg-muted/40 text-muted-foreground border-border/40 hover:text-foreground'
                  }`}
                >
                  {meta.label[language] || meta.label.EN}
                </button>
              ))}
            </div>
          </ScrollReveal>

          {isLoading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : hadiths.length === 0 ? (
            <ScrollReveal>
              <div className="text-center py-24 glass rounded-3xl border border-border/50">
                <ScrollText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground font-serif text-xl">{t('hadiths.none')}</p>
              </div>
            </ScrollReveal>
          ) : (
            <div className="space-y-5">
              {hadiths.map((hadith, idx) => {
                const meta = GRADE_META[hadith.grade] || GRADE_META.sahih;
                return (
                  <ScrollReveal key={hadith.id} delay={String((idx % 4) * 100)}>
                    <Link href={`/hadiths/${hadith.id}`} className="block group">
                      <motion.div
                        whileHover={{ y: -3 }}
                        transition={{ duration: 0.2 }}
                        className="glass rounded-3xl border border-border/50 p-7 hover:border-primary/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
                      >
                        <div className="flex items-center gap-3 mb-4 flex-wrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${meta.className}`}>
                            {meta.label[language] || meta.label.EN}
                          </span>
                          {hadith.topic && (
                            <span className="text-xs text-muted-foreground">{hadith.topic}</span>
                          )}
                        </div>
                        <p className="font-serif text-lg text-foreground leading-relaxed mb-4 line-clamp-4" dir="auto">
                          {hadith.text}
                        </p>
                        <div className="flex items-center justify-between pt-4 border-t border-border/30">
                          {hadith.source && (
                            <span className="text-sm text-muted-foreground">{hadith.source}</span>
                          )}
                          <span className="flex items-center gap-1 text-sm font-semibold text-primary uppercase tracking-wide ml-auto">
                            {t('posts.readMore')}
                            <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                          </span>
                        </div>
                      </motion.div>
                    </Link>
                  </ScrollReveal>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </PageTransition>
  );
}
