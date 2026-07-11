import { useState } from 'react';
import { useGetMyProfile, useUpdateMyProfile, useGetMe } from '@workspace/api-client-react';
import { useUser } from '@clerk/react';
import { motion } from 'framer-motion';
import { Loader2, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Wraps children and shows a nickname setup modal if the signed-in user
 * has never set a custom nickname (nicknameUpdatedAt === createdAt).
 * Admins are never blocked.
 */
export function NicknameGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded: clerkLoaded } = useUser();
  const { data: admin, isLoading: adminLoading } = useGetMe();
  const { data: profile, isLoading: profileLoading, refetch } = useGetMyProfile({
    query: { enabled: !!isSignedIn, queryKey: ['/api/profile/me'] }
  });
  const updateProfile = useUpdateMyProfile();
  const { toast } = useToast();
  const { isRtl } = useLanguage();
  const [nickname, setNickname] = useState('');

  // While loading, show children to avoid flash
  if (!clerkLoaded || !isSignedIn || adminLoading || profileLoading) {
    return <>{children}</>;
  }

  // Admins bypass the gate
  if (admin) {
    return <>{children}</>;
  }

  // Check if nickname was never manually set
  const nicknameNeverChanged =
    profile && profile.nicknameUpdatedAt === profile.createdAt;

  if (!nicknameNeverChanged) {
    return <>{children}</>;
  }

  const handleSubmit = async () => {
    if (!nickname.trim()) return;
    try {
      await updateProfile.mutateAsync({ data: { nickname: nickname.trim() } });
      await refetch();
    } catch (err: any) {
      toast({
        title: isRtl ? 'خطأ' : 'Ошибка',
        description: err?.message || 'Failed',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="glass rounded-[2rem] border border-primary/30 p-10 max-w-md w-full shadow-2xl text-center"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>

          <h2 className="text-2xl font-serif font-bold mb-3 text-foreground">
            {isRtl ? 'اختر اسمك المستعار' : 'Выберите никнейм'}
          </h2>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            {isRtl
              ? 'سيظهر هذا الاسم في التعليقات والرسائل. يمكنك تغييره مرة واحدة كل 30 يومًا.'
              : 'Это имя будет отображаться в комментариях и сообщениях. Менять можно раз в 30 дней.'}
          </p>

          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                maxLength={32}
                placeholder={isRtl ? 'اسمك هنا...' : 'Ваш никнейм...'}
                className="pl-11 bg-background/50 border-primary/20 focus:border-primary/50 rounded-xl h-12 text-base"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!nickname.trim() || updateProfile.isPending}
              className="w-full h-12 rounded-full font-bold text-sm tracking-widest uppercase gap-2 glow-gold-sm"
            >
              {updateProfile.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : null}
              {isRtl ? 'تأكيد' : 'Продолжить'}
            </Button>
          </div>
        </motion.div>
      </div>
      {/* Render children beneath overlay so app doesn't unmount */}
      {children}
    </>
  );
}
