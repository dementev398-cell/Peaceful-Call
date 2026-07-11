import { useState } from 'react';
import { useLocation } from 'wouter';
import { useUser } from '@clerk/react';
import { useStartDirectConversation } from '@workspace/api-client-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, Lock } from 'lucide-react';

interface CommentAvatarDmDialogProps {
  /** The Clerk user ID of the comment author (may be null/undefined for legacy rows) */
  authorClerkId?: string | null;
  /** Display name of the comment author */
  authorName: string;
  /** Avatar URL of the comment author (may be null/undefined) */
  authorAvatarUrl?: string | null;
  /** Whether this commenter is an admin */
  isAdmin?: boolean;
  children?: React.ReactNode;
}

/**
 * Wraps a comment avatar — clicking opens a dialog that either:
 * - Offers to start a DM with the author (if they allow DMs), or
 * - Shows an informational blocked-DMs message.
 *
 * Silently no-ops (just renders children without click handler) when:
 * - The viewer is not signed in
 * - The comment author is the viewer themselves
 */
export function CommentAvatarDmDialog({
  authorClerkId,
  authorName,
  authorAvatarUrl,
  isAdmin,
  children,
}: CommentAvatarDmDialogProps) {
  const { t, isRtl } = useLanguage();
  const { isSignedIn, user } = useUser();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const startDm = useStartDirectConversation();

  const [open, setOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [allowDms, setAllowDms] = useState<boolean | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Don't make own avatar clickable; also skip if no clerkId (deleted/legacy user)
  const isSelf = isSignedIn && user?.id === authorClerkId;
  if (isSelf || !isSignedIn || !authorClerkId) {
    return <>{children}</>;
  }

  const handleOpen = async () => {
    setOpen(true);
    setAllowDms(null);
    setStatusLoading(true);
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(authorClerkId)}/messaging-status`,
        { credentials: 'include' },
      );
      if (res.ok) {
        const data = await res.json() as { allowDirectMessages: boolean };
        setAllowDms(data.allowDirectMessages);
      } else {
        // If endpoint errors, default to allowed so UX isn't broken
        setAllowDms(true);
      }
    } catch {
      setAllowDms(true);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleStartDm = async () => {
    setIsStarting(true);
    try {
      const result = await startDm.mutateAsync({ data: { targetClerkId: authorClerkId } });
      setOpen(false);
      navigate(`/messages?conv=${result.id}`);
    } catch (err: unknown) {
      const e = err as { status?: number; data?: { error?: string } } | null;
      if (e?.status === 403) {
        // Target disabled DMs after we checked — show blocked view
        setAllowDms(false);
      } else {
        toast({ title: t('dm.error'), variant: 'destructive' });
      }
    } finally {
      setIsStarting(false);
    }
  };

  const fallbackInitial = authorName.charAt(0).toUpperCase() || '?';

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition-opacity hover:opacity-80"
        title={t('dm.dialogTitle')}
        aria-label={`${t('dm.dialogTitle')}: ${authorName}`}
      >
        {children}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-sm rounded-2xl"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border border-border/50 flex-shrink-0">
                <AvatarImage src={authorAvatarUrl || ''} />
                <AvatarFallback
                  className={`text-sm font-bold ${isAdmin ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}
                >
                  {fallbackInitial}
                </AvatarFallback>
              </Avatar>
              <span className="text-base font-semibold truncate">{authorName}</span>
            </DialogTitle>
          </DialogHeader>

          {statusLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">{t('dm.loading')}</span>
            </div>
          ) : allowDms === false ? (
            // User has disabled DMs
            <div className="py-4 space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/40 border border-border/30">
                <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">
                    {t('dm.blockedTitle')}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('dm.blockedDesc')}
                  </p>
                </div>
              </div>
              <div className={`flex ${isRtl ? 'flex-row-reverse' : 'flex-row'} justify-end`}>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setOpen(false)}
                >
                  {t('dm.close')}
                </Button>
              </div>
            </div>
          ) : (
            // User allows DMs
            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('dm.confirm').replace('{name}', authorName)}
              </p>
              <div className={`flex gap-2 ${isRtl ? 'flex-row-reverse' : 'flex-row'} justify-end`}>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setOpen(false)}
                  disabled={isStarting}
                >
                  {t('dm.cancel')}
                </Button>
                <Button
                  className="rounded-full gap-2 glow-gold-sm"
                  onClick={handleStartDm}
                  disabled={isStarting}
                >
                  {isStarting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <MessageSquare className="w-4 h-4" />}
                  {t('dm.confirmBtn')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
