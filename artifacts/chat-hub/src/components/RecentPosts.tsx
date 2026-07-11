import { useListPosts } from '@workspace/api-client-react';
import { PostCard } from './PostCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollReveal } from './ScrollReveal';
import { Loader2 } from 'lucide-react';

export function RecentPosts() {
  const { t, isRtl } = useLanguage();
  const { data: posts, isLoading } = useListPosts();

  if (isLoading) {
    return (
      <div className="py-24 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!posts || posts.length === 0) return null;

  return (
    <section className="py-32 bg-muted/30" dir="ltr">
      <div className="container mx-auto px-6 max-w-6xl">
        <ScrollReveal>
          <div className="text-center mb-16" dir={isRtl ? 'rtl' : 'ltr'}>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground">
              {t('posts.title') || 'Наши публикации'}
            </h2>
            <div className="w-16 h-1 bg-primary mx-auto mt-8 rounded-full"></div>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.slice(0, 3).map((post, idx) => (
            <ScrollReveal key={post.id} delay={String(idx * 100)}>
              <PostCard post={post} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
