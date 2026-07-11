import { PageTransition } from '@/components/PageTransition';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ScrollReveal } from '@/components/ScrollReveal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Loader2, ChevronLeft, ChevronRight, Search, X,
  AlertTriangle, RotateCw,
} from 'lucide-react';
import { SURAHS } from '@/data/surahs';
import {
  EDITIONS_BY_LANG, ARABIC_ONLY, fetchSurah, BISMILLAH, showsBismillahHeader,
  type UiLang,
} from '@/lib/quranEditions';

/* ── Searchable surah picker ─────────────────────────────────────────────── */
function SurahPicker({
  value, onChange, lang, t,
}: {
  value: number;
  onChange: (n: number) => void;
  lang: UiLang;
  t: (k: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    setTimeout(() => inputRef.current?.focus(), 30);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SURAHS;
    return SURAHS.filter((s) =>
      String(s.n) === q ||
      String(s.n).startsWith(q) ||
      s.tr.toLowerCase().includes(q) ||
      s.ru.toLowerCase().includes(q) ||
      s.en.toLowerCase().includes(q) ||
      s.ar.includes(query.trim()),
    );
  }, [query]);

  const current = SURAHS.find((x) => x.n === value);

  return (
    <div
      className="relative w-full"
      ref={boxRef}
      dir="ltr"
      onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full min-w-0 flex items-center justify-between gap-3 h-12 px-4 rounded-xl bg-card/60 border border-border/50 hover:border-primary/40 transition-colors text-left group overflow-hidden"
      >
        <span className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="flex items-center justify-center w-7 h-7 shrink-0 rounded-lg bg-primary/15 text-primary text-xs font-bold">
            {value}
          </span>
          <span className="min-w-0 flex-1 truncate font-semibold text-foreground">
            {current ? (lang === 'AR' ? current.ar : current.tr) : ''}
            {current && lang !== 'AR' && (
              <span className="text-muted-foreground font-normal"> — {lang === 'RU' ? current.ru : current.en}</span>
            )}
          </span>
        </span>
        <Search className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-border/60 bg-popover/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-border/40 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('quran.searchSurah')}
              dir="auto"
              className="w-full h-10 pl-10 pr-9 rounded-lg bg-background/70 border border-border/40 text-sm outline-none focus:border-primary/50 transition-colors"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto py-1" role="listbox">
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">{t('quran.noResults')}</div>
            )}
            {filtered.map((s) => (
              <button
                key={s.n}
                role="option"
                aria-selected={s.n === value}
                onClick={() => { onChange(s.n); setOpen(false); setQuery(''); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-primary/10 transition-colors ${s.n === value ? 'bg-primary/15' : ''}`}
              >
                <span className={`flex items-center justify-center w-7 h-7 shrink-0 rounded-lg text-xs font-bold ${s.n === value ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground'}`}>
                  {s.n}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground truncate">
                    {lang === 'AR' ? s.ar : s.tr}
                  </span>
                  <span className="block text-xs text-muted-foreground truncate">
                    {lang === 'RU' ? s.ru : lang === 'AR' ? '' : s.en}
                  </span>
                </span>
                <span className="font-quran text-lg text-primary/70 shrink-0" dir="rtl">{s.ar}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuranPage() {
  const { t, language } = useLanguage();
  const uiLang = language as UiLang;
  const editions = EDITIONS_BY_LANG[uiLang] ?? EDITIONS_BY_LANG.EN;

  const [surahNumber, setSurahNumber] = useState(1);
  const [editionId, setEditionId] = useState(editions[0].id);
  const contentTopRef = useRef<HTMLDivElement>(null);

  // When the UI language changes, keep the edition valid for the new list.
  useEffect(() => {
    if (!editions.some((e) => e.id === editionId)) {
      setEditionId(editions[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['quran', surahNumber, editionId],
    queryFn: () => fetchSurah(surahNumber, editionId),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });

  const meta = SURAHS.find((s) => s.n === surahNumber);
  const showArabicOnly = editionId === ARABIC_ONLY;

  const goTo = (n: number) => {
    if (n < 1 || n > 114) return;
    setSurahNumber(n);
    setTimeout(() => contentTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const placeLabel = meta
    ? (meta.place === 'makkah' ? t('quran.makkah') : t('quran.madinah'))
    : '';

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background gradient-bg">
      <Navbar />
      <main className="flex-grow pt-28 pb-24">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          {/* Header */}
          <ScrollReveal>
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold tracking-wider uppercase mb-6">
                <BookOpen className="w-4 h-4" />
                {t('quran.title')}
              </div>
              <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground mb-4 leading-tight" dir="auto">
                {t('quran.title')}
              </h1>
              <p className="text-muted-foreground text-base md:text-lg font-light max-w-xl mx-auto" dir="auto">
                {t('quran.subtitle')}
              </p>
            </div>
          </ScrollReveal>

          {/* Controls */}
          <ScrollReveal delay="100">
            <div className="sticky top-20 z-20 mb-8 grid sm:grid-cols-2 gap-3 p-3 rounded-2xl glass-strong border border-border/40 shadow-lg">
              <div className="min-w-0">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
                  {t('quran.selectSurah')}
                </label>
                <SurahPicker value={surahNumber} onChange={goTo} lang={uiLang} t={t} />
              </div>
              <div className="min-w-0">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
                  {t('quran.translation')}
                </label>
                <Select value={editionId} onValueChange={setEditionId}>
                  <SelectTrigger className="h-12 rounded-xl bg-card/60 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {editions.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </ScrollReveal>

          <div ref={contentTopRef} />

          {/* Surah heading */}
          {meta && (
            <div className="text-center mb-8">
              <div className="font-quran text-4xl md:text-5xl text-primary mb-2" dir="rtl">{meta.ar}</div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{surahNumber}. {uiLang === 'AR' ? meta.ar : meta.tr}</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                <span>{placeLabel}</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                <span>{meta.ayahs} {t('quran.ayahs')}</span>
              </div>
            </div>
          )}

          {/* States */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm">{t('quran.loading')}</span>
            </div>
          )}

          {isError && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-destructive" />
              </div>
              <p className="text-muted-foreground max-w-sm" dir="auto">{t('quran.error')}</p>
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:brightness-110 transition-all"
              >
                <RotateCw className="w-4 h-4" />
                {t('quran.retry')}
              </button>
            </div>
          )}

          {/* Ayahs */}
          {data && !isError && (
            <div className={`space-y-3 transition-opacity duration-300 ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
              {showsBismillahHeader(surahNumber) && (
                <div className="text-center py-6">
                  <span className="font-quran text-3xl md:text-4xl text-foreground/90" dir="rtl">{BISMILLAH}</span>
                </div>
              )}

              {data.ayahs.map((ayah, idx) => (
                <motion.div
                  key={ayah.num}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(idx * 0.015, 0.3) }}
                  className="group rounded-2xl border border-border/30 bg-card/20 hover:bg-card/40 hover:border-primary/30 transition-all duration-300 p-5 md:p-7"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="flex items-center justify-center min-w-8 h-8 px-2.5 rounded-full bg-primary/15 text-primary text-xs font-bold">
                      {surahNumber}:{ayah.num}
                    </span>
                  </div>
                  <p className="font-quran text-2xl md:text-[2rem] text-foreground text-right leading-loose mb-4" dir="rtl">
                    {ayah.arabic}
                  </p>
                  {!showArabicOnly && ayah.text && (
                    <p className="text-muted-foreground text-base md:text-lg leading-relaxed font-light border-t border-border/30 pt-4" dir="auto">
                      {ayah.text}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {/* Prev / Next */}
          {data && !isError && (
            <div className="flex items-center justify-between gap-3 mt-10" dir="ltr">
              <button
                onClick={() => goTo(surahNumber - 1)}
                disabled={surahNumber <= 1}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-border/50 text-sm font-semibold text-foreground hover:border-primary/50 hover:text-primary disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{t('quran.prev')}</span>
                {surahNumber > 1 && (
                  <span className="text-muted-foreground hidden md:inline">
                    {surahLabelShort(surahNumber - 1, uiLang)}
                  </span>
                )}
              </button>
              <span className="text-xs font-bold text-muted-foreground tabular-nums">{surahNumber} / 114</span>
              <button
                onClick={() => goTo(surahNumber + 1)}
                disabled={surahNumber >= 114}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-border/50 text-sm font-semibold text-foreground hover:border-primary/50 hover:text-primary disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                {surahNumber < 114 && (
                  <span className="text-muted-foreground hidden md:inline">
                    {surahLabelShort(surahNumber + 1, uiLang)}
                  </span>
                )}
                <span className="hidden sm:inline">{t('quran.next')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </PageTransition>
  );
}

function surahLabelShort(n: number, lang: UiLang): string {
  const s = SURAHS.find((x) => x.n === n);
  if (!s) return '';
  return lang === 'AR' ? s.ar : s.tr;
}
