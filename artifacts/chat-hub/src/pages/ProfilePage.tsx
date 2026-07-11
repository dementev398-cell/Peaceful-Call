import { PageTransition } from '@/components/PageTransition';
import { Link } from "wouter";
import { UserProfile } from "@clerk/react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ArrowLeft, Camera, Loader2, User, X, Check, Clock } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';
import { useGetMyProfile, useUpdateMyProfile, useRequestUploadUrl } from '@workspace/api-client-react';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { attachmentSrc } from '@/lib/storage';

export default function ProfilePage() {
  const { t, isRtl } = useLanguage();
  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow container mx-auto px-6 py-24 sm:py-32 max-w-4xl flex flex-col items-center">
        <div className="w-full flex justify-start mb-8" dir={isRtl ? 'rtl' : 'ltr'}>
          <Link href="/portal" className="text-muted-foreground hover:text-primary transition-colors flex items-center text-sm font-medium">
            <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180 ml-2' : 'mr-2'}`} /> {t('auth.backHome')}
          </Link>
        </div>

        {/* Custom profile section */}
        <div className="w-full mb-10" dir={isRtl ? 'rtl' : 'ltr'}>
          <CustomProfileSection />
        </div>

        <div className="w-full" dir={isRtl ? 'rtl' : 'ltr'}>
          <UserProfile routing="hash" />
        </div>
      </main>
      <Footer />
    </PageTransition>
  );
}

function CustomProfileSection() {
  const { t, language, isRtl } = useLanguage();
  const { data: profile, isLoading, refetch } = useGetMyProfile();
  const updateProfile = useUpdateMyProfile();
  const requestUploadUrl = useRequestUploadUrl();
  const { toast } = useToast();
  const [nickname, setNickname] = useState('');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) {
    return (
      <div className="glass rounded-[2rem] border border-border/30 p-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return null;

  // Compare as timestamps (ms) to avoid string-format differences between
  // createdAt and nicknameUpdatedAt from the DB.
  const nicknameNeverChanged =
    Math.abs(
      new Date(profile.nicknameUpdatedAt).getTime() -
      new Date(profile.createdAt).getTime()
    ) < 2000; // within 2 seconds → treat as "never manually changed"

  const lastChangeMs = new Date(profile.nicknameUpdatedAt).getTime();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const cooldownExpires = new Date(lastChangeMs + thirtyDaysMs);
  const isCoolingDown = !nicknameNeverChanged && Date.now() < cooldownExpires.getTime();

  const startEdit = () => {
    setNickname(profile.nickname);
    setIsEditingNickname(true);
  };

  const cancelEdit = () => {
    setIsEditingNickname(false);
    setNickname('');
  };

  const handleSaveNickname = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) return;
    // Prevent no-op save
    if (trimmed === profile.nickname) {
      setIsEditingNickname(false);
      return;
    }
    try {
      await updateProfile.mutateAsync({ data: { nickname: trimmed } });
      toast({ title: '✓', description: t('profile.nicknameSaved') });
      setIsEditingNickname(false);
      refetch();
    } catch (err: unknown) {
      const apiErr = err as { status?: number; data?: { error?: string }; message?: string } | null;
      const status = apiErr?.status;
      const msg: string = apiErr?.message || '';

      if (status === 409) {
        // Nickname already taken — show friendly localised message
        toast({
          title: t('nickname.error'),
          description: t('nickname.taken'),
          variant: 'destructive',
        });
        return;
      }

      // Cooldown: server embeds the next-allowed date in the message
      const dateMatch = msg.match(/after (.+)\./);
      if (status === 429 || dateMatch) {
        const dateStr = dateMatch ? dateMatch[1] : null;
        const d = dateStr ? new Date(dateStr) : cooldownExpires;
        const formattedDate = language === 'AR'
          ? d.toLocaleDateString('ar')
          : language === 'EN'
            ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
            : d.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' });
        toast({
          title: t('profile.cooldownTitle'),
          description: t('profile.cooldownDesc').replace('{date}', formattedDate),
          variant: 'destructive',
        });
        return;
      }

      toast({ title: t('nickname.error'), description: msg || t('profile.saveError'), variant: 'destructive' });
    }
  };

  const handleAvatarUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const { uploadURL, objectPath } = await requestUploadUrl.mutateAsync({
        data: { name: file.name, size: file.size, contentType: file.type },
      });
      const putRes = await fetch(uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!putRes.ok) throw new Error(t('profile.uploadFailed'));
      await updateProfile.mutateAsync({ data: { avatarUrl: objectPath } });
      toast({ title: '✓', description: t('profile.avatarSaved') });
      await refetch();
    } catch (err: unknown) {
      const e = err as { message?: string } | null;
      toast({ title: t('nickname.error'), description: e?.message || t('profile.saveError'), variant: 'destructive' });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await updateProfile.mutateAsync({ data: { avatarUrl: null } });
      toast({ title: '✓', description: t('profile.avatarRemoved') });
      await refetch();
    } catch (err: unknown) {
      const e = err as { message?: string } | null;
      toast({ title: t('nickname.error'), description: e?.message || t('profile.saveError'), variant: 'destructive' });
    }
  };

  const avatarSrc = profile.avatarUrl ? attachmentSrc(profile.avatarUrl) : '';

  return (
    <div className="glass rounded-[2rem] border border-border/30 p-8 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-serif font-bold">{t('profile.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('profile.subtitle')}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-8 items-start">
        {/* Avatar block */}
        <div className="flex flex-col items-center gap-3 flex-shrink-0">
          <div className="relative group">
            {/* key forces AvatarImage to re-mount when src changes, clearing browser cache */}
            <Avatar key={avatarSrc} className="w-24 h-24 border-2 border-primary/30 shadow-lg">
              <AvatarImage src={avatarSrc} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-serif font-bold">
                {profile.nickname.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm border-2 border-primary/30"
            >
              {isUploadingAvatar
                ? <Loader2 className="w-6 h-6 animate-spin text-primary" />
                : <Camera className="w-6 h-6 text-primary" />}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => handleAvatarUpload(e.target.files)}
          />
          <div className="flex flex-col gap-1.5 w-full items-center">
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="rounded-full text-xs gap-1.5 w-full bg-primary text-primary-foreground font-semibold hover:brightness-110"
            >
              {isUploadingAvatar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
              {t('profile.uploadAvatar')}
            </Button>
            {profile.avatarUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveAvatar}
                disabled={updateProfile.isPending}
                className="rounded-full text-xs text-muted-foreground hover:text-destructive gap-1.5 w-full"
              >
                <X className="w-3 h-3" />
                {t('profile.removeAvatar')}
              </Button>
            )}
          </div>
        </div>

        {/* Nickname block */}
        <div className="flex-1 min-w-0">
          <div className="mb-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('profile.nicknameLabel')}
            </label>
          </div>

          {isEditingNickname ? (
            <div className="space-y-3">
              <Input
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                maxLength={32}
                className="bg-background/50 border-primary/30 focus:border-primary/60 rounded-xl"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveNickname();
                  if (e.key === 'Escape') cancelEdit();
                }}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveNickname}
                  disabled={!nickname.trim() || updateProfile.isPending}
                  className="rounded-full gap-2 text-sm h-9 bg-primary text-primary-foreground font-semibold hover:brightness-110"
                >
                  {updateProfile.isPending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Check className="w-3.5 h-3.5" />}
                  {t('admin.save')}
                </Button>
                <Button variant="ghost" onClick={cancelEdit} className="rounded-full text-sm h-9">
                  {t('admin.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xl font-serif font-bold text-foreground">{profile.nickname}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startEdit}
                  disabled={isCoolingDown}
                  className="rounded-full text-xs h-8 px-3"
                >
                  {t('admin.edit')}
                </Button>
              </div>
              {isCoolingDown && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-xl px-3 py-2 border border-border/30">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0 text-primary/60" />
                  <span>
                    {t('profile.cooldownDesc').replace(
                      '{date}',
                      language === 'AR'
                        ? cooldownExpires.toLocaleDateString('ar')
                        : language === 'EN'
                          ? cooldownExpires.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                          : cooldownExpires.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })
                    )}
                  </span>
                </div>
              )}
              {!isCoolingDown && !nicknameNeverChanged && (
                <p className="text-xs text-muted-foreground">
                  {t('profile.cooldownHint')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
