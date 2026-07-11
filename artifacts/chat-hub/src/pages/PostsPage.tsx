import { parseApiDate } from "@/lib/date";
import { resolvePostCover } from "@/lib/storage";
import { PageTransition } from '@/components/PageTransition';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ScrollReveal } from '@/components/ScrollReveal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useListPosts } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, Calendar, User, ArrowRight, BookOpen, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';

type SortMode = 'newest' | 'oldest' | 'alpha';

const LOCALE_TAGS: Record<string, string> = { RU: 'ru', EN: 'en', AR: 'ar' };

export default function PostsPage() {
  const { t, isRtl, language } = useLanguage();
  const localeTag = LOCALE_TAGS[language] || 'en';
  const { data: allPosts = [], isLoading } = useListPosts();
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [yearFilter, setYearFilter] = useState<string>('all');

  const years = useMemo(() => {
    const set = new Set<string>();
    allPosts.forEach((p) => set.add(String(parseApiDate(p.createdAt).getFullYear())));
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [allPosts]);

  const currentYear = String(new Date().getFullYear());

  const posts = useMemo(() => {
    let list = allPosts;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.excerpt || '').toLowerCase().includes(q) ||
          (p.content || '').toLowerCase().includes(q)
      );
    }
    if (yearFilter !== 'all') {
      list = list.filter((p) => String(parseApiDate(p.createdAt).getFullYear()) === yearFilter);
    }
    list = [...list].sort((a, b) => {
      if (sortMode === 'alpha') return a.title.localeCompare(b.title, localeTag);
      const diff = parseApiDate(b.createdAt).getTime() - parseApiDate(a.createdAt).getTime();
      return sortMode === 'oldest' ? -diff : diff;
    });
    return list;
  }, [allPosts, query, yearFilter, sortMode, localeTag]);

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background gradient-bg" dir="ltr">
      <Navbar />
      <main className="flex-grow pt-28 pb-24">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <ScrollReveal>
            <div className="text-center mb-16" dir={isRtl ? 'rtl' : 'ltr'}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold tracking-wider uppercase mb-6">
                <BookOpen className="w-4 h-4" />
                {t('posts.title')}
              </div>
              <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground mb-6 leading-tight">
                {t('posts.title')}
              </h1>
              <div className="w-20 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 mx-auto mb-6 rounded-full" />
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-serif">
                {t('posts.subtitle')}
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="flex flex-col sm:flex-row gap-3 mb-10 bg-card/40 p-2 rounded-3xl sm:rounded-full border border-border/40 shadow-sm glass">
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
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="flex-1 sm:w-auto h-12 px-4 rounded-full bg-muted/20 border border-transparent text-sm text-foreground focus:ring-0 focus:ring-offset-0 focus:bg-muted/40 transition-colors">
                    <SelectValue placeholder={t('filter.allYears')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border/40 bg-card/95 backdrop-blur-xl shadow-xl">
                    <SelectItem value="all" className="rounded-xl focus:bg-primary/20 focus:text-primary">{t('filter.allYears')}</SelectItem>
                    {years.includes(currentYear) && <SelectItem value={currentYear} className="rounded-xl focus:bg-primary/20 focus:text-primary">{t('filter.thisYear')}</SelectItem>}
                    {years.filter((y) => y !== currentYear).map((y) => (
                      <SelectItem key={y} value={y} className="rounded-xl focus:bg-primary/20 focus:text-primary">{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

          {isLoading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <ScrollReveal>
              <div className="text-center py-24 glass rounded-3xl border border-border/50">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground font-serif text-xl">{t('posts.noArticles')}</p>
              </div>
            </ScrollReveal>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {posts.map((post, idx) => {
                const coverSrc = resolvePostCover(post);
                return (
                <ScrollReveal key={post.id} delay={String((idx % 4) * 100)}>
                  <Link href={`/posts/${post.slug}`} className="block h-full group">
                    <motion.div
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="h-full glass rounded-3xl border border-border/50 overflow-hidden hover:border-primary/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 flex flex-col"
                    >
                      {coverSrc ? (
                        <div className="relative h-52 overflow-hidden">
                          <img
                            src={coverSrc}
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                        </div>
                      ) : (
                        <div className="h-20 bg-gradient-to-br from-primary/10 via-accent/20 to-transparent relative overflow-hidden">
                          <div className="absolute inset-0 shimmer" />
                        </div>
                      )}

                      <div className="p-7 flex-1 flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
                        <div className="flex items-center gap-3 mb-4">
                          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-widest uppercase border border-primary/20">
                            {t('posts.title').slice(0, -1) || 'Статья'}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            {parseApiDate(post.createdAt).toLocaleDateString(
                              isRtl ? 'ar' : undefined,
                              { year: 'numeric', month: 'long', day: 'numeric' }
                            )}
                          </span>
                        </div>

                        <h2 className="text-xl font-serif font-bold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors duration-300 leading-snug">
                          {post.title}
                        </h2>

                        {post.excerpt && (
                          <p className="text-muted-foreground text-sm line-clamp-3 mb-5 leading-relaxed">
                            {post.excerpt}
                          </p>
                        )}

                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-border/30">
                          {post.authorName && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                <User className="w-3 h-3 text-primary" />
                              </div>
                              <span>{post.authorName}</span>
                            </div>
                          )}
                          <span className={`flex items-center gap-1 text-sm font-semibold text-primary uppercase tracking-wide ${isRtl ? 'mr-auto' : 'ml-auto'}`}>
                            {t('posts.readMore')}
                            <ArrowRight className={`w-4 h-4 opacity-0 transition-all duration-300 ${isRtl ? 'translate-x-2 group-hover:-translate-x-0 rotate-180' : '-translate-x-2 group-hover:translate-x-0'}`} />
                          </span>
                        </div>
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
