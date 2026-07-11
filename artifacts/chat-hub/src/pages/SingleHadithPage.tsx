import { parseApiDate } from "@/lib/date";
import { PageTransition } from '@/components/PageTransition';
import { useState } from 'react';
import { useGetHadith, useGetHadithInteractions, useCreateHadithComment, useDeleteHadithComment, useReactToHadith, getGetHadithInteractionsQueryKey, useGetMyProfile, getGetMyProfileQueryKey, useGetMe } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Loader2, ArrowLeft, BookMarked, ThumbsUp, ThumbsDown, MessageCircle, Trash2, ShieldCheck, Send, User } from 'lucide-react';
import { ScrollReveal } from '@/components/ScrollReveal';
import NotFound from './not-found';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { GRADE_META } from '@/lib/hadithGrades';
import { attachmentSrc } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { CommentAvatarDmDialog } from '@/components/CommentAvatarDmDialog';

export default function SingleHadithPage() {
  const { id } = useParams();
  const { t, isRtl, language } = useLanguage();
  const hadithId = Number(id);
  const { data: hadith, isLoading, error } = useGetHadith(hadithId, {
    query: { enabled: Number.isFinite(hadithId), queryKey: ['/api/hadiths', hadithId] },
  });

  if (isLoading) {
    return (
      <PageTransition className="min-h-screen flex flex-col bg-background gradient-bg">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </main>
      </PageTransition>
    );
  }

  if (error || !hadith || !Number.isFinite(hadithId)) {
    return <NotFound />;
  }

  const meta = GRADE_META[hadith.grade] || GRADE_META.sahih;

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background gradient-bg" dir="ltr">
      <Navbar />
      <main className="flex-grow pt-24 pb-32">
        <article className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <ScrollReveal>
            <Link href="/hadiths" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-10 group" dir={isRtl ? 'rtl' : 'ltr'}>
              <ArrowLeft className={`w-4 h-4 transition-transform ${isRtl ? 'group-hover:translate-x-1 rotate-180' : 'group-hover:-translate-x-1'}`} />
              {t('posts.back')}
            </Link>

            <div className="flex items-center gap-3 mb-8 flex-wrap" dir={isRtl ? 'rtl' : 'ltr'}>
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border ${meta.className}`}>
                {meta.label[language] || meta.label.EN}
              </span>
              {hadith.topic && (
                <span className="text-sm text-muted-foreground">{hadith.topic}</span>
              )}
            </div>

            <div className="glass rounded-3xl border border-border/50 p-8 sm:p-12 mb-8 relative overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
              <BookMarked className={`w-10 h-10 text-primary/20 absolute top-6 ${isRtl ? 'left-6' : 'right-6'}`} />
              <p className="font-serif text-2xl sm:text-3xl text-foreground leading-relaxed whitespace-pre-wrap">
                {hadith.text}
              </p>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground border-t border-border/30 pt-6 mb-16" dir={isRtl ? 'rtl' : 'ltr'}>
              {hadith.narrator && (
                <div>
                  <span className="font-semibold text-foreground">{t('hadiths.narrator')}: </span>
                  {hadith.narrator}
                </div>
              )}
              {hadith.source && (
                <div>
                  <span className="font-semibold text-foreground">{t('hadiths.source')}: </span>
                  {hadith.source}
                </div>
              )}
            </div>
          </ScrollReveal>

          {/* Reactions + Comments */}
          <ScrollReveal delay="200">
            <HadithInteractions hadithId={hadith.id} />
          </ScrollReveal>
        </article>
      </main>
      <Footer />
    </PageTransition>
  );
}

function HadithInteractions({ hadithId }: { hadithId: number }) {
  const { t, isRtl } = useLanguage();
  const { isSignedIn, user } = useAuth();
  const { data: myProfile } = useGetMyProfile({ query: { queryKey: getGetMyProfileQueryKey(), enabled: isSignedIn } });
  const { data: me } = useGetMe();
  const isAdmin = !!me && (me.role === 'owner' || me.role === 'editor');
  const queryClient = useQueryClient();
  const { data: interactions, isLoading } = useGetHadithInteractions(hadithId);
  const reactMut = useReactToHadith();
  const addComment = useCreateHadithComment();
  const deleteComment = useDeleteHadithComment();
  const { toast } = useToast();
  const [commentText, setCommentText] = useState('');

  const invalidateInteractions = () => {
    queryClient.invalidateQueries({ queryKey: getGetHadithInteractionsQueryKey(hadithId) });
  };

  const handleReact = (type: 'like' | 'dislike') => {
    if (!isSignedIn) {
      toast({ title: t('post.signInToComment'), variant: 'destructive' });
      return;
    }
    reactMut.mutate({ id: hadithId, data: { type } }, {
      onSuccess: () => invalidateInteractions(),
    });
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    try {
      await addComment.mutateAsync({ id: hadithId, data: { content: commentText } });
      setCommentText('');
      toast({ title: '✓', description: isRtl ? 'تم إرسال التعليق' : 'Комментарий отправлен' });
      invalidateInteractions();
    } catch {
      toast({ title: t('nickname.error'), variant: 'destructive' });
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!confirm(isRtl ? 'هل تريد حذف التعليق؟' : 'Удалить комментарий?')) return;
    try {
      await deleteComment.mutateAsync({ id: hadithId, commentId });
      invalidateInteractions();
    } catch {
      toast({ title: t('nickname.error'), variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const likes = interactions?.likes ?? 0;
  const dislikes = interactions?.dislikes ?? 0;
  const myReaction = interactions?.myReaction ?? null;
  const comments = interactions?.comments ?? [];

  return (
    <div className="space-y-10 max-w-3xl mx-auto">
      {/* Reaction Bar */}
      <div className="flex items-center gap-4 p-5 glass rounded-[2rem] border border-border/40 shadow-lg">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => handleReact('like')}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl font-semibold transition-all duration-300 ${
            myReaction === 'like'
              ? 'bg-primary text-primary-foreground glow-gold-sm shadow-md shadow-primary/20'
              : 'bg-muted/50 hover:bg-muted text-foreground hover:text-primary border border-border/40'
          }`}
        >
          <ThumbsUp className="w-4 h-4" />
          <span>{t('post.likes')}</span>
          <span className="bg-background/40 text-xs font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center shadow-inner">
            {likes}
          </span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => handleReact('dislike')}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl font-semibold transition-all duration-300 ${
            myReaction === 'dislike'
              ? 'bg-destructive text-destructive-foreground shadow-md shadow-destructive/20'
              : 'bg-muted/50 hover:bg-muted text-foreground hover:text-destructive border border-border/40'
          }`}
        >
          <ThumbsDown className="w-4 h-4" />
          <span>{t('post.dislikes')}</span>
          <span className="bg-background/40 text-xs font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center shadow-inner">
            {dislikes}
          </span>
        </motion.button>

        <div className="ml-auto flex items-center gap-2 text-muted-foreground text-sm font-medium px-4 py-2 rounded-2xl bg-muted/20 border border-border/30">
          <MessageCircle className="w-4 h-4" />
          <span>{comments.length}</span>
        </div>
      </div>

      {/* Comments Section */}
      <div>
        <h3 className="text-2xl font-serif font-bold mb-6 flex items-center gap-3">
          <MessageCircle className="w-6 h-6 text-primary" />
          {t('post.comments')}
          {comments.length > 0 && (
            <span className="text-base font-normal text-muted-foreground">({comments.length})</span>
          )}
        </h3>

        {/* Comment input */}
        {isSignedIn ? (
          <div className="mb-8 glass rounded-2xl border border-border/30 p-5">
            <div className="flex gap-3">
              <Avatar className="w-10 h-10 border border-primary/20 flex-shrink-0">
                {myProfile?.avatarUrl && <AvatarImage src={attachmentSrc(myProfile.avatarUrl)} />}
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder={t('post.addComment')}
                  className="bg-background/50 border-border/50 min-h-[90px] resize-none focus:border-primary/50 rounded-xl"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && e.ctrlKey) handleComment();
                  }}
                />
                <Button
                  onClick={handleComment}
                  disabled={!commentText.trim() || addComment.isPending}
                  className="rounded-full gap-2 glow-gold-sm"
                >
                  {addComment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {t('post.send')}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8 glass rounded-2xl border border-border/30 p-6 text-center">
            <User className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground mb-4">{t('post.signInToComment')}</p>
            <Link href="/sign-in">
              <Button className="rounded-full gap-2">{t('post.signIn')}</Button>
            </Link>
          </div>
        )}

        {/* Comments list */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground font-serif">
              <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>{t('post.noComments')}</p>
            </div>
          ) : (
            <AnimatePresence>
              {comments.map(comment => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="glass rounded-2xl border border-border/30 p-5"
                >
                  <div className="flex items-start gap-3">
                    <CommentAvatarDmDialog
                      authorClerkId={comment.authorClerkId}
                      authorName={comment.authorName}
                      authorAvatarUrl={comment.authorAvatarUrl}
                      isAdmin={comment.isAdmin}
                    >
                      <Avatar className="w-10 h-10 border border-border/50 flex-shrink-0">
                        <AvatarImage src={comment.authorAvatarUrl ? attachmentSrc(comment.authorAvatarUrl) : ''} />
                        <AvatarFallback className={`text-sm font-bold ${comment.isAdmin ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {comment.authorName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </CommentAvatarDmDialog>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{comment.authorName}</span>
                        {comment.isAdmin && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20">
                            <ShieldCheck className="w-3 h-3" />
                            {t('post.admin')}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {parseApiDate(comment.createdAt).toLocaleDateString(isRtl ? 'ar' : undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                    </div>
                    {isSignedIn && (comment.authorClerkId === user?.id || isAdmin) && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10 flex-shrink-0"
                        title={t('post.deleteComment')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
