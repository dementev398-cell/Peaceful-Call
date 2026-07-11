import { parseApiDate } from "@/lib/date";
import { resolvePostCover } from "@/lib/storage";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Calendar, ArrowRight, User } from "lucide-react";
import { motion } from "framer-motion";

export function PostCard({ post }: { post: any }) {
  const { t, isRtl } = useLanguage();
  const coverSrc = resolvePostCover(post);

  return (
    <Link href={`/posts/${post.slug}`} className="block h-full group" dir={isRtl ? 'rtl' : 'ltr'}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        className="h-full glass rounded-[2rem] border border-border/50 overflow-hidden hover:border-primary/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 flex flex-col"
      >
        {coverSrc ? (
          <div className="relative h-52 overflow-hidden">
            <img
              src={coverSrc}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
          </div>
        ) : (
          <div className="h-24 bg-gradient-to-br from-primary/10 via-accent/20 to-transparent relative overflow-hidden">
            <div className="absolute inset-0 shimmer" />
          </div>
        )}

        <div className="p-7 flex-1 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-widest uppercase border border-primary/20">
              {t('posts.singular')}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Calendar className="w-3.5 h-3.5" />
              {parseApiDate(post.createdAt).toLocaleDateString(
                isRtl ? 'ar' : undefined,
                { year: 'numeric', month: 'long', day: 'numeric' }
              )}
            </span>
          </div>

          <h3 className="text-xl font-serif font-bold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors duration-300 leading-snug">
            {post.title}
          </h3>

          {post.excerpt && (
            <p className="text-muted-foreground text-sm line-clamp-3 mb-5 leading-relaxed font-light">
              {post.excerpt}
            </p>
          )}

          <div className="mt-auto flex items-center justify-between pt-5 border-t border-border/30">
            {post.authorName && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-3 h-3 text-primary" />
                </div>
                <span>{post.authorName}</span>
              </div>
            )}
            <span className="flex items-center gap-1 text-sm font-semibold text-primary uppercase tracking-wide ml-auto">
              {t('posts.readMore') || 'Читать'}
              <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
