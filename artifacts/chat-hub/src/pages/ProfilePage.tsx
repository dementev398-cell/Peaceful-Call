import { PageTransition } from '@/components/PageTransition';
import { Link } from "wouter";
import { UserProfile, useUser } from "@clerk/react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ArrowLeft, Camera, Loader2, User, X, Check, Clock, Settings, MessageSquare } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';
import { useGetMyProfile, useUpdateMyProfile, useRequestUploadUrl } from '@workspace/api-client-react';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { attachmentSrc } from '@/lib/storage';

export default function ProfilePage() {
  const { t, isRtl } = useLanguage();
  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow container mx-auto px-6 py-24 sm:py-32 max-w-3xl flex flex-col items-center">
        {/* Back link */}
        <div className="w-full flex justify-start mb-8" dir={isRtl ? 'rtl' : 'ltr'}>
          <Link href="/portal" className="text-muted-foreground hover:text-primary transition-colors flex items-center text-sm font-medium">
            <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180 ml-2' : 'mr-2'}`} />
            {t('auth.backHome')}
          </Link>
        </div>

        {/* ── Section 1: Public profile (nickname + avatar) ── */}
        <div className="w-full mb-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary/80">
              {t('profile.publicSection')}
            </h2>
          </div>
          <CustomProfileSection />
        </div>

        {/* ── Section divider ── */}
        <div className="w-full flex items-center gap-4 my-8" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="flex items-center gap-2 text-muted-foreground/60">
            <Settings className="w-3.5 h-3.5" />
            <span className="text-[0.65rem] uppercase tracking-[0.2em] font-semibold">
              {t('profile.accountSection')}
            </span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-transparent" />
        </div>

        {/* ── Section 2: Clerk account management (email, password, security) ── */}
        <div className="w-full" dir={isRtl ? 'rtl' : 'ltr'}>
          <p className="text-xs text-muted-foreground mb-5">
            {t('profile.accountDesc')}
          </p>
          <UserProfile routing="hash" />
        </div>
      </main>
      <Footer />
    </PageTransition>
  );
}

function CustomProfileSection() {
  const { t, language, isRtl } = useLanguage();
  const { user } = useUser();
  const { data: profile, isLoading, refetch } = useGetMyProfile();
  const updateProfile = useUpdateMyProfile();
  const requestUploadUrl = useRequestUploadUrl();
  const { toast } = useToast();
  const [nickname, setNickname] = useState('');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingDms, setIsSavingDms] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) {
    return (
      <div className="glass rounded-[2rem] border border-border/30 p-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return null;

  // allowDirectMessages may be present on the extended profile response
  const profileWithDms = profile as typeof profile & { allowDirectMessages?: boolean };
  const allowDms = profileWithDms.allowDirectMessages ?? true;

  // Cooldown logic
  const nicknameNeverChanged =
    Math.abs(
      new Date(profile.nicknameUpdatedAt).getTime() -
      new Date(profile.createdAt).getTime()
    ) < 2000;

  const lastChangeMs = new Date(profile.nicknameUpdatedAt).getTime();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const cooldownExpires = new Date(lastChangeMs + thirtyDaysMs);
  const isCoolingDown = !nicknameNeverChanged && Date.now() < cooldownExpires.getTime();

  const formatDate = (d: Date) =>
    language === 'AR'
      ? d.toLocaleDateString('ar')
      : language === 'EN'
        ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : d.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' });

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
        toast({ title: t('nickname.error'), description: t('nickname.taken'), variant: 'destructive' });
        return;
      }

      const dateMatch = msg.match(/after (.+)\./);
      if (status === 429 || dateMatch) {
        const dateStr = dateMatch ? dateMatch[1] : null;
        const d = dateStr ? new Date(dateStr) : cooldownExpires;
        toast({
          title: t('profile.cooldownTitle'),
          description: t('profile.cooldownDesc').replace('{date}', formatDate(d)),
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

  const handleToggleAllowDms = async (checked: boolean) => {
    setIsSavingDms(true);
    try {
      // We call PATCH /api/profile/me with allowDirectMessages
      // The generated hook wraps the same endpoint; we call fetch directly
      // since the generated client may not include this field.
      const res = await fetch('/api/profile/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowDirectMessages: checked }),
      });
      if (!res.ok) {
        throw new Error(t('profile.saveError'));
      }
      await refetch();
      toast({ title: '✓', description: t('profile.dmsSaved') });
    } catch (err: unknown) {
      const e = err as { message?: string } | null;
      toast({ title: t('nickname.error'), description: e?.message || t('profile.saveError'), variant: 'destructive' });
    } finally {
      setIsSavingDms(false);
    }
  };

  const avatarSrc = profile.avatarUrl ? attachmentSrc(profile.avatarUrl) : '';

  // Full name from Clerk — only shown when it actually exists on the user object
  const hasFullName = !!(user?.firstName || user?.lastName);
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  return (
    <div className="glass rounded-[2rem] border border-border/30 p-8 shadow-xl">
      <div className="flex flex-col sm:flex-row gap-8 items-start">
        {/* Avatar block */}
        <div className="flex flex-col items-center gap-3 flex-shrink-0">
          <div className="relative group">
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

        {/* Right column: nickname + optional full name + DM toggle */}
        <div className="flex-1 min-w-0 space-y-5" dir={isRtl ? 'rtl' : 'ltr'}>
          {/* Nickname field */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              {t('profile.nicknameLabel')}
            </label>

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
              <div className="space-y-2">
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
                      {t('profile.cooldownDesc').replace('{date}', formatDate(cooldownExpires))}
                    </span>
                  </div>
                )}
                {!isCoolingDown && !nicknameNeverChanged && (
                  <p className="text-xs text-muted-foreground">{t('profile.cooldownHint')}</p>
                )}
              </div>
            )}
          </div>

          {/* Full name — only shown when Clerk has a name set for this user */}
          {hasFullName && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                {t('profile.fullNameLabel')}
              </label>
              <div className="flex items-center gap-3">
                <span className="text-base font-sans text-foreground/90">{fullName}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">{t('profile.fullNameHint')}</p>
            </div>
          )}

          {/* Allow DMs toggle */}
          <div className="pt-2 border-t border-border/20">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <MessageSquare className="w-4 h-4 text-primary/60 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground block">
                    {t('profile.allowDmsLabel')}
                  </span>
                  <span className="text-xs text-muted-foreground block mt-0.5">
                    {t('profile.allowDmsHint')}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0">
                {isSavingDms
                  ? <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  : (
                    <Switch
                      checked={allowDms}
                      onCheckedChange={handleToggleAllowDms}
                      disabled={isSavingDms}
                    />
                  )
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
