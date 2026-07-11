import { parseApiDate } from "@/lib/date";
import { PageTransition } from '@/components/PageTransition';
import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'wouter';
import {
  useGetMe,
  useListContent,
  useUpsertContent,
  useDeleteContent,
  useListMyPosts,
  useCreatePost,
  useUpdatePost,
  useDeletePost,
  useRequestUploadUrl,
  useListMyHadiths,
  useCreateHadith,
  useUpdateHadith,
  useDeleteHadith,
  useListAdmins,
  useCreateAdmin,
  useDeleteAdmin,
  useUpdateAdminRole,
  useListMessages,
  useGetMessage,
  getGetMessageQueryKey,
  useMarkMessageRead,
  useReplyToMessage,
  useDeleteMessage,
  useGetUnreadCount,
  useUpdateMyAdminAvatar,
  useListFaq,
  useCreateFaq,
  useUpdateFaq,
  useDeleteFaq,
  useGetAdminStats,
  type ContentItem,
  type PostAttachment,
  type FaqItem
} from '@workspace/api-client-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Loader2, LogOut, Plus, Trash2, Edit2, Check, X,
  Mail, MailOpen, Reply, MessageCircle, Crown, Shield,
  ShieldAlert, LogIn, Users, Ban,
  ChevronLeft, FileText, Settings, LayoutDashboard,
  ScrollText, Paperclip, Film, Camera, ShieldCheck, ShieldOff,
  Home, Eye, Maximize2, Minimize2, HelpCircle, ArrowUp, ArrowDown,
  MessagesSquare, Inbox
} from 'lucide-react';
import { useClerk, useUser } from '@clerk/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentDict } from '@/hooks/use-content';
import { attachmentSrc, getAttachmentType, resolvePostCover } from '@/lib/storage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

// ── Reusable Confirm Dialog ───────────────────────────────────────────────────
function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant = 'destructive',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: 'destructive' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="glass border border-border/50 rounded-2xl shadow-2xl max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-serif text-lg">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 mt-2">
          <AlertDialogCancel
            onClick={onCancel}
            className="rounded-full h-9 text-sm border-border/50"
          >
            {t('admin.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={`rounded-full h-9 text-sm font-semibold ${
              confirmVariant === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {confirmLabel ?? t('admin.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

async function clerkFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

function AdminGateShell({ children }: { children: React.ReactNode }) {
  return (
    <PageTransition className="relative min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 overflow-hidden gradient-bg">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-primary/8 blur-3xl" />
      </div>
      <div className="relative z-10 glass rounded-[2rem] p-10 text-center shadow-2xl max-w-sm w-full border border-border/40">
        {children}
      </div>
    </PageTransition>
  );
}

export default function AdminPage() {
  const { data: user, isLoading } = useGetMe();
  const { isSignedIn, isLoaded: clerkLoaded } = useUser();
  const [, setLocation] = useLocation();
  const { signOut } = useClerk();
  const { data: unreadData } = useGetUnreadCount();
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();
  const unreadCount = unreadData?.count ?? 0;

  if (isLoading || !clerkLoaded) {
    return (
      <PageTransition className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </PageTransition>
    );
  }

  if (!isSignedIn) {
    return (
      <AdminGateShell>
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-primary/10 flex items-center justify-center">
          <LogIn className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-serif font-bold mb-3">{t('admin.panel')}</h2>
        <p className="text-muted-foreground text-sm mb-7">{t('admin.signInRequired')}</p>
        <Button onClick={() => setLocation('/sign-in')} className="w-full h-11 rounded-full font-bold">
          {t('admin.signIn')}
        </Button>
      </AdminGateShell>
    );
  }

  if (!user) {
    return (
      <AdminGateShell>
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7 text-destructive" />
        </div>
        <h2 className="text-2xl font-serif font-bold mb-3">{t('admin.accessDenied')}</h2>
        <p className="text-muted-foreground text-sm mb-7">{t('admin.accessDeniedDesc')}</p>
        <Button variant="outline" onClick={() => signOut({ redirectUrl: '/' })} className="w-full h-11 rounded-full">
          {t('admin.signOut')}
        </Button>
      </AdminGateShell>
    );
  }

  const isOwner = user.role === 'owner';
  const tabs = isOwner
    ? ['dashboard', 'content', 'faq', 'posts', 'hadiths', 'messages', 'users', 'admins']
    : ['dashboard', 'posts', 'hadiths', 'messages'];

  const roleLabel = isOwner
    ? (language === 'RU' ? 'Владелец' : language === 'AR' ? 'مالك' : 'Owner')
    : (language === 'RU' ? 'Редактор' : language === 'AR' ? 'محرر' : 'Editor');

  const handleLogout = () => {
    signOut({ redirectUrl: '/' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col gradient-bg">
      {/* ── Sticky Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-primary/10 bg-card/70 backdrop-blur-xl sticky top-0 z-20 shadow-sm shadow-primary/5">
        {/* Mobile: two-row layout */}
        {isMobile ? (
          <div className="px-4 py-2 space-y-2">
            {/* Row 1: logo + title + role */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <LayoutDashboard className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="font-serif font-bold text-sm text-foreground truncate flex-1">
                {t('admin.panel')}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-widest border border-primary/20 flex-shrink-0">
                {roleLabel}
              </span>
            </div>
            {/* Row 2: back home + avatar + logout */}
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-bold text-muted-foreground border border-border/50 hover:border-primary/40 hover:text-primary transition-all bg-card/40"
              >
                <Home className="w-3 h-3" />
                {t('admin.backHome')}
              </Link>
              <AdminAvatarWidget adminId={user.id ?? 0} />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-1 text-muted-foreground hover:text-destructive h-8 px-2 rounded-xl border border-transparent hover:border-destructive/30 hover:bg-destructive/8 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold">{t('admin.signOut')}</span>
              </Button>
            </div>
          </div>
        ) : (
          /* Desktop: single-row layout */
          <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <LayoutDashboard className="w-4 h-4 text-primary" />
              </div>
              <span className="font-serif font-bold text-sm sm:text-base text-foreground truncate">
                {t('admin.panel')}
              </span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary uppercase tracking-widest border border-primary/20 flex-shrink-0">
                {roleLabel}
              </span>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Back to home button */}
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-bold text-muted-foreground border border-border/50 hover:border-primary/40 hover:text-primary transition-all bg-card/40 backdrop-blur-sm whitespace-nowrap"
              >
                <Home className="w-3.5 h-3.5" />
                {t('admin.backHome')}
              </Link>
              <span className="text-xs text-muted-foreground hidden lg:block truncate max-w-[180px]">{user.email}</span>
              <AdminAvatarWidget adminId={user.id ?? 0} />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5 text-muted-foreground hover:text-foreground hover:text-destructive h-9 rounded-xl border border-transparent hover:border-destructive/30 hover:bg-destructive/8 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs font-semibold">{t('admin.signOut')}</span>
              </Button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-6xl">
        <Tabs defaultValue={tabs[0]} className="w-full" dir="ltr">
          {/* Scrollable tabs strip */}
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-6 sm:mb-8 pb-1">
            <TabsList className="inline-flex bg-card/40 glass border border-border/30 p-1 sm:p-1.5 rounded-2xl gap-0.5 sm:gap-1 min-w-max shadow-inner">
              <TabsTrigger value="dashboard" className="rounded-xl text-[11px] sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:glow-gold-sm whitespace-nowrap px-3 sm:px-4 py-2 sm:py-2.5 gap-1.5 sm:gap-2 transition-all font-semibold text-muted-foreground data-[state=active]:font-bold">
                <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {t('admin.dashboard')}
              </TabsTrigger>
              {isOwner && (
                <TabsTrigger value="content" className="rounded-xl text-[11px] sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:glow-gold-sm whitespace-nowrap px-3 sm:px-4 py-2 sm:py-2.5 gap-1.5 sm:gap-2 transition-all font-semibold text-muted-foreground data-[state=active]:font-bold">
                  <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {t('admin.content')}
                </TabsTrigger>
              )}
              {isOwner && (
                <TabsTrigger value="faq" className="rounded-xl text-[11px] sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:glow-gold-sm whitespace-nowrap px-3 sm:px-4 py-2 sm:py-2.5 gap-1.5 sm:gap-2 transition-all font-semibold text-muted-foreground data-[state=active]:font-bold">
                  <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {t('admin.faq')}
                </TabsTrigger>
              )}
              <TabsTrigger value="posts" className="rounded-xl text-[11px] sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:glow-gold-sm whitespace-nowrap px-3 sm:px-4 py-2 sm:py-2.5 gap-1.5 sm:gap-2 transition-all font-semibold text-muted-foreground data-[state=active]:font-bold">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {t('admin.posts')}
              </TabsTrigger>
              <TabsTrigger value="hadiths" className="rounded-xl text-[11px] sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:glow-gold-sm whitespace-nowrap px-3 sm:px-4 py-2 sm:py-2.5 gap-1.5 sm:gap-2 transition-all font-semibold text-muted-foreground data-[state=active]:font-bold">
                <ScrollText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {t('admin.hadiths')}
              </TabsTrigger>
              <TabsTrigger value="messages" className="rounded-xl text-[11px] sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:glow-gold-sm whitespace-nowrap px-3 sm:px-4 py-2 sm:py-2.5 gap-1.5 sm:gap-2 relative transition-all font-semibold text-muted-foreground data-[state=active]:font-bold">
                <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {t('admin.messages')}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-destructive text-destructive-foreground text-[9px] sm:text-[10px] flex items-center justify-center font-bold shadow-sm ring-2 ring-background">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
              {isOwner && (
                <TabsTrigger value="users" className="rounded-xl text-[11px] sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:glow-gold-sm whitespace-nowrap px-3 sm:px-4 py-2 sm:py-2.5 gap-1.5 sm:gap-2 transition-all font-semibold text-muted-foreground data-[state=active]:font-bold">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {t('admin.users')}
                </TabsTrigger>
              )}
              {isOwner && (
                <TabsTrigger value="admins" className="rounded-xl text-[11px] sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:glow-gold-sm whitespace-nowrap px-3 sm:px-4 py-2 sm:py-2.5 gap-1.5 sm:gap-2 transition-all font-semibold text-muted-foreground data-[state=active]:font-bold">
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {t('admin.admins')}
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="mt-0">
            <DashboardManager isOwner={isOwner} />
          </TabsContent>
          {isOwner && (
            <TabsContent value="content" className="mt-0">
              <ContentManager />
            </TabsContent>
          )}
          {isOwner && (
            <TabsContent value="faq" className="mt-0">
              <FaqManager />
            </TabsContent>
          )}
          <TabsContent value="posts" className="mt-0">
            <PostsManager />
          </TabsContent>
          <TabsContent value="hadiths" className="mt-0">
            <HadithsManager />
          </TabsContent>
          <TabsContent value="messages" className="mt-0">
            <MessagesManager userRole={user.role ?? 'editor'} />
          </TabsContent>
          {isOwner && (
            <TabsContent value="users" className="mt-0">
              <UsersManager />
            </TabsContent>
          )}
          {isOwner && (
            <TabsContent value="admins" className="mt-0">
              <AdminsManager />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

// ── Admin Avatar Widget (shown in header) ─────────────────────────────────────
function AdminAvatarWidget({ adminId }: { adminId: number }) {
  const { data: admins } = useListAdmins();
  const updateAvatar = useUpdateMyAdminAvatar();
  const requestUploadUrl = useRequestUploadUrl();
  const { dict } = useContentDict();
  const { toast } = useToast();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const logoImg = dict['site.logo'] || '/logo-source.jpg';
  const meAdmin = admins?.find((a) => a.id === adminId);
  const avatarSrc = meAdmin?.avatarUrl ? attachmentSrc(meAdmin.avatarUrl) : logoImg;

  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { uploadURL, objectPath } = await requestUploadUrl.mutateAsync({
        data: { name: file.name, size: file.size, contentType: file.type },
      });
      await fetch(uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      await updateAvatar.mutateAsync({ data: { avatarUrl: objectPath } });
      toast({ title: '✓', description: t('admin.avatarUpdated') });
    } catch (e: any) {
      toast({ title: t('admin.error'), description: e.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    try {
      await updateAvatar.mutateAsync({ data: { avatarUrl: null } });
      toast({ title: '✓', description: t('admin.avatarRemoved') });
    } catch (e: any) {
      toast({ title: t('admin.error'), description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="flex items-center gap-1">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e.target.files)} />
      <div className="relative group">
        <Avatar className="w-8 h-8 border border-primary/30 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <AvatarImage src={avatarSrc} className="object-cover" />
          <AvatarFallback className="bg-primary/10">
            <img src={logoImg} alt="logo" className="w-full h-full object-cover" />
          </AvatarFallback>
        </Avatar>
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          </div>
        )}
      </div>
      <div className="relative group hidden sm:block">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground/50 hover:text-primary rounded-lg"
          onClick={() => fileInputRef.current?.click()}
          title={t('admin.changeAvatar')}
        >
          <Camera className="w-3 h-3" />
        </Button>
        {meAdmin?.avatarUrl && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground/50 hover:text-destructive rounded-lg"
            onClick={handleRemove}
            title={t('admin.removeAvatar')}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Section header helper ─────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3 mb-1">
      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <h3 className="text-xl font-serif font-bold leading-tight">{title}</h3>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

// ── Status badge helper ───────────────────────────────────────────────────────
function StatusBadge({ published }: { published: boolean }) {
  const { t } = useLanguage();
  return published ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
      {t('admin.published')}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
      {t('admin.draft')}
    </span>
  );
}

// ── Users Manager ────────────────────────────────────────────────────────────
type PendingAction =
  | { type: 'ban'; userId: string; isBanned: boolean; name: string }
  | { type: 'delete'; userId: string; name: string };

function UsersManager() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await clerkFetch('/api/admins/clerk-users');
      setUsers(data);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const executeBan = async (userId: string, isBanned: boolean) => {
    setActionLoading(userId + '_ban');
    try {
      await clerkFetch(`/api/admins/clerk-users/${userId}/${isBanned ? 'unban' : 'ban'}`, { method: 'POST' });
      toast({ title: isBanned ? t('admin.unbanUser') : t('admin.banUser') });
      await loadUsers();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const executeDelete = async (userId: string) => {
    setActionLoading(userId + '_del');
    try {
      await clerkFetch(`/api/admins/clerk-users/${userId}`, { method: 'DELETE' });
      toast({ title: t('admin.deleteUser') });
      await loadUsers();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirm = async () => {
    if (!pending) return;
    const p = pending;
    setPending(null);
    if (p.type === 'ban') await executeBan(p.userId, p.isBanned);
    else await executeDelete(p.userId);
  };

  const refreshLabel = language === 'RU' ? 'Обновить' : language === 'AR' ? 'تحديث' : 'Refresh';

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-7 h-7 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      {pending && (
        <ConfirmDialog
          open={!!pending}
          title={
            pending.type === 'delete'
              ? t('admin.confirmDelete').split('?')[0] + '?'
              : pending.isBanned
                ? t('admin.confirmBan').replace(/\?$/, '') + '?'
                : t('admin.confirmBan').replace(/ban/i, 'Unban').replace(/заблокировать/i, 'Разблокировать') + '?'
          }
          description={
            pending.type === 'delete'
              ? t('admin.confirmDelete')
              : t('admin.confirmBan')
          }
          confirmLabel={
            pending.type === 'delete'
              ? t('admin.deleteUser')
              : pending.isBanned
                ? t('admin.unbanUser')
                : t('admin.banUser')
          }
          confirmVariant={pending.type === 'delete' ? 'destructive' : 'default'}
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
        />
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <SectionHeader icon={Users} title={t('admin.userMgmt')} description={t('admin.userMgmtDesc')} />
        <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading} className="rounded-full text-xs gap-1.5 h-8 self-start">
          <Loader2 className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {refreshLabel}
        </Button>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-20 bg-card/40 border border-dashed border-border/50 rounded-2xl">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />
          <p className="text-muted-foreground font-serif">{t('admin.noUsers')}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/40 bg-card/30 overflow-hidden shadow-lg shadow-black/10">
          <div className="px-4 py-3 border-b border-border/40 bg-muted/10 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {t('admin.userMgmt')}
            </span>
            <span className="text-xs font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">{users.length}</span>
          </div>
          <div className="divide-y divide-border/30">
            {users.map((u, idx) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`flex items-center gap-3 px-4 py-3 transition-colors group ${
                  u.banned
                    ? 'bg-destructive/3 hover:bg-destructive/5'
                    : 'hover:bg-muted/20'
                }`}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full overflow-hidden bg-muted border border-border flex-shrink-0 shadow-sm">
                  {u.imageUrl ? (
                    <img src={u.imageUrl} alt={u.firstName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground bg-primary/10">
                      {(u.firstName || u.email || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {[u.firstName, u.lastName].filter(Boolean).join(' ') || 'Anonymous'}
                    </span>
                    {u.banned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold uppercase tracking-wider border border-destructive/20">
                        <Ban className="w-2.5 h-2.5" />
                        {t('admin.banned')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPending({ type: 'ban', userId: u.id, isBanned: u.banned, name: u.firstName })}
                    disabled={!!actionLoading}
                    className={`h-8 px-2.5 rounded-lg text-xs font-medium gap-1.5 transition-all ${
                      u.banned
                        ? 'text-emerald-500 hover:bg-emerald-500/10'
                        : 'text-amber-500 hover:bg-amber-500/10'
                    }`}
                  >
                    {actionLoading === u.id + '_ban' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Ban className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">{u.banned ? t('admin.unbanUser') : t('admin.banUser')}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPending({ type: 'delete', userId: u.id, name: u.firstName || u.email })}
                    disabled={!!actionLoading}
                    className="h-8 w-8 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all"
                  >
                    {actionLoading === u.id + '_del' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Messages Manager ─────────────────────────────────────────────────────────
function MessagesManager({ userRole }: { userRole: string }) {
  const { data: messages = [], isLoading, refetch } = useListMessages();
  const markRead = useMarkMessageRead();
  const reply = useReplyToMessage();
  const remove = useDeleteMessage();
  const { toast } = useToast();
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showThread, setShowThread] = useState(false);
  const { data: thread, refetch: refetchThread } = useGetMessage(selectedId!, {
    query: { queryKey: getGetMessageQueryKey(selectedId!), enabled: selectedId !== null }
  });

  const handleSelect = async (id: number) => {
    setSelectedId(id);
    if (isMobile) setShowThread(true);
    const msg = messages.find(m => m.id === id);
    if (msg && !msg.isRead) {
      await markRead.mutateAsync({ id });
      refetch();
    }
  };

  const handleReply = async () => {
    if (!selectedId || !replyText.trim()) return;
    try {
      await reply.mutateAsync({ id: selectedId, data: { content: replyText } });
      toast({ title: t('admin.sendReply') });
      setReplyText('');
      refetchThread();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('admin.delete') + '?')) return;
    try {
      await remove.mutateAsync({ id });
      if (selectedId === id) { setSelectedId(null); setShowThread(false); }
      refetch();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (isLoading) return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const threadPanel = (
    <div className="bg-card border border-border/50 rounded-2xl flex flex-col overflow-hidden h-full shadow-lg shadow-black/10">
      {!selectedId || !thread ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
          <div className="text-center">
            <Mail className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-serif text-sm">{t('admin.selectMsg')}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="p-4 sm:p-5 border-b border-border/40">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {isMobile && (
                  <Button variant="ghost" size="sm" onClick={() => setShowThread(false)} className="rounded-full gap-1.5 text-xs h-8 -ml-2 mb-2">
                    <ChevronLeft className="w-4 h-4" />
                    Назад
                  </Button>
                )}
                <h4 className="font-bold text-base leading-tight">{thread.message.subject || t('admin.noSubject')}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('admin.from')}: <span className="text-foreground font-medium">{thread.message.senderName}</span>
                  {thread.message.senderEmail && ` <${thread.message.senderEmail}>`}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {parseApiDate(thread.message.createdAt).toLocaleString()}
                </p>
              </div>
              {userRole === 'owner' && (
                <Button variant="ghost" size="icon" onClick={() => handleDelete(thread.message.id)} className="text-muted-foreground hover:text-destructive h-8 w-8 flex-shrink-0 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 max-h-[280px]">
            <div className="bg-muted/40 rounded-xl p-4 border border-border/20">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{thread.message.content}</p>
            </div>
            {thread.replies.map(r => (
              <div key={r.id} className={`rounded-xl p-4 ${r.senderRole === 'owner' || r.senderRole === 'editor' ? 'bg-primary/8 border border-primary/15 ml-4' : 'bg-muted/30'}`}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-bold text-primary">{r.senderName}</span>
                  <span className="text-[10px] text-muted-foreground">{parseApiDate(r.createdAt).toLocaleString()}</span>
                  {(r.senderRole === 'owner' || r.senderRole === 'editor') && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20">
                      {t('admin.admins')}
                    </span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{r.content}</p>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-border/40 space-y-2.5">
            <Textarea
              placeholder={t('admin.replyPlaceholder')}
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              className="bg-background/50 min-h-[72px] resize-none text-sm rounded-xl border-border/50"
            />
            <Button onClick={handleReply} disabled={!replyText.trim() || reply.isPending} className="rounded-full gap-2 text-sm h-9 w-full sm:w-auto">
              {reply.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Reply className="w-3.5 h-3.5" />}
              {t('admin.sendReply')}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <SectionHeader icon={MessageCircle} title={t('admin.messages')} />

      {isMobile ? (
        /* Mobile: toggle between inbox list and thread */
        showThread ? (
          <div className="min-h-[480px]">{threadPanel}</div>
        ) : (
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg shadow-black/10">
            <div className="px-4 py-3 border-b border-border/40 bg-muted/20">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('admin.inbox')}</span>
            </div>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center">
                <MessageCircle className="w-8 h-8 mb-2 text-muted-foreground/25" />
                <p className="text-sm text-muted-foreground">{t('admin.noMessages')}</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {messages.map(msg => (
                  <button
                    key={msg.id}
                    onClick={() => handleSelect(msg.id)}
                    className={`w-full text-left p-4 transition-colors hover:bg-muted/20 ${selectedId === msg.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex-shrink-0">
                        {msg.isRead
                          ? <MailOpen className="w-3.5 h-3.5 text-muted-foreground/50" />
                          : <Mail className="w-3.5 h-3.5 text-primary" />
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-xs font-semibold truncate ${!msg.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {msg.senderName}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                            {parseApiDate(msg.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {msg.subject && (
                          <p className={`text-xs truncate mb-0.5 ${!msg.isRead ? 'font-medium text-foreground/80' : 'text-muted-foreground'}`}>
                            {msg.subject}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground truncate">{msg.content}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      ) : (
        /* Desktop: side-by-side */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[480px]">
          {/* Inbox */}
          <div className="md:col-span-1 bg-card border border-border/50 rounded-2xl overflow-hidden flex flex-col shadow-lg shadow-black/10">
            <div className="px-4 py-3 border-b border-border/40 bg-muted/20">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('admin.inbox')}</span>
            </div>
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <MessageCircle className="w-8 h-8 mb-2 text-muted-foreground/25" />
                <p className="text-sm text-muted-foreground">{t('admin.noMessages')}</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40 overflow-y-auto flex-1">
                {messages.map(msg => (
                  <button
                    key={msg.id}
                    onClick={() => handleSelect(msg.id)}
                    className={`w-full text-left p-4 transition-colors hover:bg-muted/20 ${selectedId === msg.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex-shrink-0">
                        {msg.isRead
                          ? <MailOpen className="w-3.5 h-3.5 text-muted-foreground/50" />
                          : <Mail className="w-3.5 h-3.5 text-primary" />
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-xs font-semibold truncate ${!msg.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {msg.senderName}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                            {parseApiDate(msg.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {msg.subject && (
                          <p className={`text-xs truncate mb-0.5 ${!msg.isRead ? 'font-medium text-foreground/80' : 'text-muted-foreground'}`}>
                            {msg.subject}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground truncate">{msg.content}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Thread panel */}
          <div className="md:col-span-2">{threadPanel}</div>
        </div>
      )}
    </div>
  );
}

// ── Dashboard Manager ─────────────────────────────────────────────────────────
function DashboardManager({ isOwner }: { isOwner: boolean }) {
  const { t } = useLanguage();
  const { data: stats, isLoading, isError } = useGetAdminStats();

  const cards: { key: string; label: string; value: number; icon: React.ElementType; ownerOnly?: boolean }[] = [
    { key: 'posts', label: t('admin.statPosts'), value: stats?.posts ?? 0, icon: FileText },
    { key: 'hadiths', label: t('admin.statHadiths'), value: stats?.hadiths ?? 0, icon: ScrollText },
    { key: 'faq', label: t('admin.statFaq'), value: stats?.faq ?? 0, icon: HelpCircle, ownerOnly: true },
    { key: 'messages', label: t('admin.statMessages'), value: stats?.messages ?? 0, icon: Inbox },
    { key: 'unread', label: t('admin.statUnread'), value: stats?.unreadMessages ?? 0, icon: Mail },
    { key: 'conversations', label: t('admin.statConversations'), value: stats?.conversations ?? 0, icon: MessagesSquare, ownerOnly: true },
    { key: 'users', label: t('admin.statUsers'), value: stats?.users ?? 0, icon: Users, ownerOnly: true },
    { key: 'admins', label: t('admin.statAdmins'), value: stats?.admins ?? 0, icon: Shield, ownerOnly: true },
  ];

  const visible = cards.filter((c) => isOwner || !c.ownerOnly);

  return (
    <div className="space-y-7">
      <SectionHeader icon={LayoutDashboard} title={t('admin.dashboard')} description={t('admin.dashboardDesc')} />

      {isError ? (
        <div className="text-center py-16 bg-card/40 border border-dashed border-destructive/40 rounded-2xl">
          <ShieldAlert className="w-10 h-10 mx-auto mb-3 text-destructive/50" />
          <p className="text-sm text-muted-foreground">{t('admin.statsError')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {visible.map((c, idx) => (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="glass border border-border/40 rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/10 hover:border-primary/30 hover:shadow-primary/5 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:glow-gold-sm transition-all">
                  <c.icon className="w-4 h-4 text-primary" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-foreground tabular-nums leading-none">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/50" /> : c.value}
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground font-medium mt-1.5 leading-tight">{c.label}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── FAQ Manager ───────────────────────────────────────────────────────────────
function FaqManager() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: items = [], isLoading, refetch } = useListFaq();
  const create = useCreateFaq();
  const update = useUpdateFaq();
  const remove = useDeleteFaq();

  const [addingNew, setAddingNew] = useState(false);
  const [newItem, setNewItem] = useState({ question: '', answer: '' });
  const [editId, setEditId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState({ question: '', answer: '' });
  const [pendingDelete, setPendingDelete] = useState<FaqItem | null>(null);
  const [reordering, setReordering] = useState(false);

  if (isLoading) return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const sorted = [...items].sort((a, b) => a.order - b.order || a.id - b.id);

  const handleAdd = async () => {
    if (!newItem.question.trim() || !newItem.answer.trim()) {
      toast({ title: t('admin.error'), description: t('admin.faqRequired'), variant: 'destructive' });
      return;
    }
    try {
      const nextOrder = sorted.length > 0 ? Math.max(...sorted.map((i) => i.order)) + 1 : 0;
      await create.mutateAsync({ data: { question: newItem.question.trim(), answer: newItem.answer.trim(), order: nextOrder } });
      toast({ title: '✓', description: t('admin.saved') });
      setNewItem({ question: '', answer: '' });
      setAddingNew(false);
      await refetch();
    } catch (e: any) {
      toast({ title: t('admin.error'), description: e.message, variant: 'destructive' });
    }
  };

  const startEdit = (item: FaqItem) => {
    setEditId(item.id);
    setEditDraft({ question: item.question, answer: item.answer });
  };

  const handleSaveEdit = async (item: FaqItem) => {
    if (!editDraft.question.trim() || !editDraft.answer.trim()) {
      toast({ title: t('admin.error'), description: t('admin.faqRequired'), variant: 'destructive' });
      return;
    }
    try {
      await update.mutateAsync({ id: item.id, data: { question: editDraft.question.trim(), answer: editDraft.answer.trim() } });
      toast({ title: '✓', description: t('admin.saved') });
      setEditId(null);
      await refetch();
    } catch (e: any) {
      toast({ title: t('admin.error'), description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const item = pendingDelete;
    setPendingDelete(null);
    try {
      await remove.mutateAsync({ id: item.id });
      toast({ title: '✓', description: t('admin.saved') });
      await refetch();
    } catch (e: any) {
      toast({ title: t('admin.error'), description: e.message, variant: 'destructive' });
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sorted.length) return;
    const a = sorted[index];
    const b = sorted[target];
    setReordering(true);
    try {
      await Promise.all([
        update.mutateAsync({ id: a.id, data: { order: b.order } }),
        update.mutateAsync({ id: b.id, data: { order: a.order } }),
      ]);
      await refetch();
    } catch (e: any) {
      toast({ title: t('admin.error'), description: e.message, variant: 'destructive' });
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="space-y-7">
      {pendingDelete && (
        <ConfirmDialog
          open={!!pendingDelete}
          title={t('admin.faqDeleteTitle')}
          description={t('admin.faqDeleteDesc')}
          confirmLabel={t('admin.delete')}
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <SectionHeader icon={HelpCircle} title={t('admin.faqMgmt')} description={t('admin.faqDesc')} />
        <Button variant="outline" size="sm" onClick={() => setAddingNew(!addingNew)} className="rounded-full gap-1.5 text-xs h-9 self-start">
          <Plus className="w-3.5 h-3.5" />
          {t('admin.faqAdd')}
        </Button>
      </div>

      {addingNew && (
        <div className="glass border border-primary/20 rounded-2xl p-5 space-y-4 shadow-lg shadow-primary/5">
          <h4 className="text-sm font-bold text-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t('admin.faqAdd')}
          </h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">{t('admin.faqQuestion')}</label>
              <Input value={newItem.question} onChange={(e) => setNewItem({ ...newItem, question: e.target.value })} placeholder={t('admin.faqQuestionPlaceholder')} className="bg-background/50 h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">{t('admin.faqAnswer')}</label>
              <Textarea value={newItem.answer} onChange={(e) => setNewItem({ ...newItem, answer: e.target.value })} placeholder={t('admin.faqAnswerPlaceholder')} className="bg-background/50 min-h-[100px] resize-none text-sm rounded-xl" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={create.isPending} className="rounded-full gap-1.5 text-sm h-9">
              {create.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {t('admin.faqAdd')}
            </Button>
            <Button variant="ghost" onClick={() => { setAddingNew(false); setNewItem({ question: '', answer: '' }); }} className="rounded-full text-sm h-9">
              {t('admin.cancel')}
            </Button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-16 bg-card/40 border border-dashed border-border/50 rounded-2xl">
          <HelpCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />
          <p className="text-muted-foreground font-serif">{t('admin.faqEmpty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((item, idx) => {
            const isEditing = editId === item.id;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`rounded-2xl border p-4 sm:p-5 transition-all ${isEditing ? 'border-primary/30 bg-primary/4 shadow-sm shadow-primary/5' : 'border-border/40 bg-card/50 hover:border-border/70'}`}
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block font-medium">{t('admin.faqQuestion')}</label>
                      <Input value={editDraft.question} onChange={(e) => setEditDraft({ ...editDraft, question: e.target.value })} className="bg-background/50 h-9 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block font-medium">{t('admin.faqAnswer')}</label>
                      <Textarea value={editDraft.answer} onChange={(e) => setEditDraft({ ...editDraft, answer: e.target.value })} className="bg-background/50 min-h-[100px] resize-none text-sm rounded-xl" />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleSaveEdit(item)} disabled={update.isPending} className="rounded-full gap-1.5 text-sm h-9">
                        {update.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        {t('admin.save')}
                      </Button>
                      <Button variant="ghost" onClick={() => setEditId(null)} className="rounded-full text-sm h-9">
                        {t('admin.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-0.5 flex-shrink-0 pt-0.5">
                      <Button variant="ghost" size="icon" onClick={() => move(idx, -1)} disabled={idx === 0 || reordering} title={t('admin.moveUp')} className="h-6 w-6 rounded-md text-muted-foreground/50 hover:text-primary disabled:opacity-20">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => move(idx, 1)} disabled={idx === sorted.length - 1 || reordering} title={t('admin.moveDown')} className="h-6 w-6 rounded-md text-muted-foreground/50 hover:text-primary disabled:opacity-20">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-serif font-bold text-foreground/90 leading-snug">{item.question}</p>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-3">{item.answer}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(item)} className="h-8 w-8 rounded-lg text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-all">
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setPendingDelete(item)} className="h-8 w-8 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Content Manager ──────────────────────────────────────────────────────────
function ContentManager() {
  const { data: contentItems = [], isLoading, refetch } = useListContent();
  const upsert = useUpsertContent();
  const remove = useDeleteContent();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [editedItems, setEditedItems] = useState<Record<string, ContentItem>>({});
  const [addingNew, setAddingNew] = useState(false);
  const [newItem, setNewItem] = useState({ label: '', value: '', type: 'text' as const, group: 'Site' });
  const [pendingDelete, setPendingDelete] = useState<ContentItem | null>(null);

  if (isLoading) return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const grouped = contentItems.reduce((acc, item) => {
    const g = item.group || 'General';
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {} as Record<string, ContentItem[]>);

  const handleSave = async () => {
    const itemsToSave = Object.values(editedItems);
    if (itemsToSave.length === 0) return;
    try {
      await upsert.mutateAsync({ data: { items: itemsToSave } });
      toast({ title: '✓', description: t('admin.saved') });
      setEditedItems({});
      await refetch();
    } catch (error: any) {
      toast({ title: t('admin.error'), description: error.message, variant: 'destructive' });
    }
  };

  const handleAddNew = async () => {
    if (!newItem.label || !newItem.value) {
      toast({ title: t('admin.error'), description: t('admin.faqRequired'), variant: 'destructive' });
      return;
    }
    const key = newItem.group.toLowerCase().replace(/\s+/g, '.') + '.' + newItem.label.toLowerCase().replace(/\s+/g, '_');
    try {
      await upsert.mutateAsync({ data: { items: [{ key, group: newItem.group, label: newItem.label, type: newItem.type, value: newItem.value }] } });
      toast({ title: '✓', description: t('admin.saved') });
      setNewItem({ label: '', value: '', type: 'text', group: 'Site' });
      setAddingNew(false);
      await refetch();
    } catch (error: any) {
      toast({ title: t('admin.error'), description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const key = pendingDelete.key;
    setPendingDelete(null);
    try {
      await remove.mutateAsync({ key });
      toast({ title: '✓', description: t('admin.saved') });
      await refetch();
    } catch (error: any) {
      toast({ title: t('admin.error'), description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-7">
      {pendingDelete && (
        <ConfirmDialog
          open={!!pendingDelete}
          title={t('admin.delete')}
          description={pendingDelete.label || pendingDelete.key}
          confirmLabel={t('admin.delete')}
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <SectionHeader icon={Settings} title={t('admin.contentMgmt')} description={t('admin.contentDesc')} />
        <div className="flex items-center gap-2">
          {Object.keys(editedItems).length > 0 && (
            <Button onClick={handleSave} disabled={upsert.isPending} className="rounded-full gap-2 text-sm h-9">
              {upsert.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {t('admin.save')}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setAddingNew(!addingNew)} className="rounded-full gap-1.5 text-xs h-9">
            <Plus className="w-3.5 h-3.5" />
            {t('admin.addNew')}
          </Button>
        </div>
      </div>

      {addingNew && (
        <div className="bg-card border border-primary/20 rounded-2xl p-5 space-y-4 shadow-lg shadow-primary/5">
          <h4 className="text-sm font-bold text-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t('admin.addNew')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">{t('admin.fieldGroup')}</label>
              <Input value={newItem.group} onChange={e => setNewItem({...newItem, group: e.target.value})} placeholder="Site" className="bg-background/50 h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">{t('admin.fieldType')}</label>
              <Select value={newItem.type} onValueChange={(v: any) => setNewItem({...newItem, type: v})}>
                <SelectTrigger className="bg-background/50 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="textarea">Textarea</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                  <SelectItem value="image">Image URL</SelectItem>
                  <SelectItem value="color">Color</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">{t('admin.fieldKey')}</label>
              <Input value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} placeholder="Site Name" className="bg-background/50 h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">{t('admin.fieldValue')}</label>
              <Input value={newItem.value} onChange={e => setNewItem({...newItem, value: e.target.value})} placeholder="Peaceful Call" className="bg-background/50 h-9 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddNew} disabled={upsert.isPending} className="rounded-full gap-1.5 text-sm h-9">
              {upsert.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {t('admin.addNew')}
            </Button>
            <Button variant="ghost" onClick={() => setAddingNew(false)} className="rounded-full text-sm h-9">
              {t('admin.cancel')}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-7">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="space-y-3">
            <div className="flex items-center gap-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{group}</h4>
              <div className="flex-1 h-px bg-border/40" />
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map(item => {
                const isEdited = editedItems[item.key] !== undefined;
                const currentItem = isEdited ? editedItems[item.key] : item;
                const handleChange = (val: string) => {
                  setEditedItems(prev => ({ ...prev, [item.key]: { ...item, value: val } }));
                };
                return (
                  <div key={item.key} className={`flex flex-col sm:flex-row gap-3 p-4 rounded-xl border items-start transition-all ${isEdited ? 'border-primary/30 bg-primary/4 shadow-sm shadow-primary/5' : 'border-border/40 bg-card/50 hover:border-border/70 hover:bg-card/80'}`}>
                    <div className="w-full sm:w-1/3 flex flex-col justify-center min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">{item.label || item.key}</span>
                      <span className="text-[10px] text-muted-foreground/60 font-mono truncate mt-0.5">{item.key}</span>
                    </div>
                    <div className="w-full sm:w-2/3 flex gap-2 min-w-0">
                      <div className="flex-1 min-w-0">
                        {item.type === 'textarea' ? (
                          <Textarea value={currentItem.value} onChange={e => handleChange(e.target.value)} className="bg-background/50 min-h-[80px] resize-none text-sm rounded-xl" />
                        ) : item.type === 'color' ? (
                          <div className="flex items-center gap-2">
                            <input type="color" value={currentItem.value} onChange={e => handleChange(e.target.value)} className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0" />
                            <Input value={currentItem.value} onChange={e => handleChange(e.target.value)} className="bg-background/50 font-mono text-sm h-9" />
                          </div>
                        ) : item.type === 'image' ? (
                          <div className="space-y-2">
                            <Input value={currentItem.value} onChange={e => handleChange(e.target.value)} className="bg-background/50 text-sm h-9" />
                            {currentItem.value && (
                              <div className="h-16 w-16 rounded-lg bg-muted border border-border overflow-hidden">
                                <img src={currentItem.value} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              </div>
                            )}
                          </div>
                        ) : (
                          <Input value={currentItem.value} onChange={e => handleChange(e.target.value)} className="bg-background/50 text-sm h-9" />
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setPendingDelete(item)} className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 flex-shrink-0 h-9 w-9 rounded-lg transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Post Content Renderer (reused from SinglePostPage logic) ──────────────────
function PostContentRenderer({ content, isRtl }: { content: string; isRtl: boolean }) {
  return (
    <div
      className="prose prose-lg dark:prose-invert prose-p:font-serif prose-p:text-base prose-p:leading-relaxed prose-headings:font-serif prose-a:text-primary max-w-none"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {content.split('\n').map((paragraph, i) => {
        if (!paragraph.trim()) return null;
        if (paragraph.startsWith('## ')) return <h2 key={i}>{paragraph.replace('## ', '')}</h2>;
        if (paragraph.startsWith('### ')) return <h3 key={i}>{paragraph.replace('### ', '')}</h3>;
        if (paragraph.startsWith('**') && paragraph.endsWith('**')) return <p key={i}><strong>{paragraph.slice(2, -2)}</strong></p>;
        return <p key={i}>{paragraph}</p>;
      })}
    </div>
  );
}

// ── Posts Manager ─────────────────────────────────────────────────────────────
function PostsManager() {
  const { data: posts = [], isLoading, refetch } = useListMyPosts();
  const create = useCreatePost();
  const update = useUpdatePost();
  const remove = useDeletePost();
  const { toast } = useToast();
  const { t, isRtl } = useLanguage();
  const [editingPost, setEditingPost] = useState<any>(null);
  const requestUploadUrl = useRequestUploadUrl();
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverMode, setCoverMode] = useState<'url' | 'upload'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);

  const handleCoverFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const { uploadURL, objectPath } = await requestUploadUrl.mutateAsync({
        data: { name: file.name, size: file.size, contentType: file.type },
      });
      const putRes = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!putRes.ok) throw new Error(`Upload failed: ${file.name}`);
      setEditingPost((prev: any) => ({ ...prev, coverImageUrl: objectPath }));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  const handleAddFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: PostAttachment[] = [];
      for (const file of Array.from(files)) {
        const { uploadURL, objectPath } = await requestUploadUrl.mutateAsync({
          data: { name: file.name, size: file.size, contentType: file.type },
        });
        const putRes = await fetch(uploadURL, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });
        if (!putRes.ok) throw new Error(`Upload failed: ${file.name}`);
        uploaded.push({ url: objectPath, type: getAttachmentType(file.type), name: file.name });
      }
      setEditingPost((prev: any) => ({
        ...prev,
        attachments: [...(prev?.attachments ?? []), ...uploaded],
      }));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (idx: number) => {
    setEditingPost((prev: any) => ({
      ...prev,
      attachments: (prev?.attachments ?? []).filter((_: any, i: number) => i !== idx),
    }));
  };

  if (isLoading) return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const handleSave = async () => {
    if (!editingPost.title) {
      toast({ title: 'Error', description: t('admin.title') + ' required', variant: 'destructive' });
      return;
    }
    try {
      if (editingPost.id) {
        await update.mutateAsync({ id: editingPost.id, data: editingPost });
      } else {
        await create.mutateAsync({ data: editingPost });
      }
      toast({ title: '✓' });
      setEditingPost(null);
      setShowPreview(false);
      setPreviewFullscreen(false);
      refetch();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('admin.delete') + '?')) return;
    try {
      await remove.mutateAsync({ id });
      refetch();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // ── Preview panel content ──────────────────────────────────────────────────
  const previewPanelContent = editingPost && (
    <div className="flex flex-col h-full">
      {/* Preview toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 bg-card/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Предпросмотр</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary"
            onClick={() => setPreviewFullscreen(fs => !fs)}
            title={previewFullscreen ? 'Свернуть' : 'Развернуть на весь экран'}
          >
            {previewFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          {!previewFullscreen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => setShowPreview(false)}
              title="Закрыть предпросмотр"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Preview body */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-8">
        {/* Cover */}
        {editingPost.coverImageUrl && (
          <div className="w-full aspect-[21/9] rounded-2xl overflow-hidden mb-8 shadow-xl border border-border/30">
            <img src={attachmentSrc(editingPost.coverImageUrl)} alt={editingPost.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground leading-tight mb-4">
          {editingPost.title || <span className="text-muted-foreground/40 italic">Без заголовка</span>}
        </h1>

        {/* Excerpt */}
        {editingPost.excerpt && (
          <p className="text-base text-muted-foreground font-serif leading-relaxed mb-6 border-l-2 border-primary/40 pl-4 italic">
            {editingPost.excerpt}
          </p>
        )}

        {/* Status badge */}
        <div className="mb-6">
          <StatusBadge published={editingPost.published ?? false} />
        </div>

        {/* Content */}
        {editingPost.content ? (
          <PostContentRenderer content={editingPost.content} isRtl={isRtl} />
        ) : (
          <div className="text-center py-12 text-muted-foreground/40 italic font-serif border border-dashed border-border/30 rounded-xl">
            Содержание поста появится здесь...
          </div>
        )}
      </div>
    </div>
  );

  if (editingPost !== null) {
    return (
      <>
        {/* Fullscreen preview dialog */}
        <Dialog open={previewFullscreen} onOpenChange={(open) => {
          if (!open) setPreviewFullscreen(false);
        }}>
          <DialogContent className="max-w-5xl w-full h-[90vh] p-0 overflow-hidden flex flex-col glass border border-border/50 rounded-2xl shadow-2xl">
            {previewPanelContent}
          </DialogContent>
        </Dialog>

        <div className={`space-y-5 ${showPreview && !previewFullscreen ? 'lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0 lg:items-start' : ''}`}>
          {/* Editor column */}
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <Button variant="ghost" size="sm" onClick={() => { setEditingPost(null); setShowPreview(false); setPreviewFullscreen(false); }} className="rounded-full gap-1.5 text-sm h-9 -ml-2 flex-shrink-0">
                  <ChevronLeft className="w-4 h-4" />
                  {t('admin.back')}
                </Button>
                <h3 className="text-base font-serif font-bold truncate">{editingPost.id ? t('admin.edit') : t('admin.newPost')}</h3>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant={showPreview ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowPreview(p => !p)}
                  className={`rounded-full gap-1.5 h-9 text-sm ${showPreview ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20' : ''}`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Предпросмотр
                </Button>
                <Button onClick={handleSave} disabled={create.isPending || update.isPending} className="rounded-full gap-2 h-9 text-sm">
                  {create.isPending || update.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {t('admin.save')}
                </Button>
              </div>
            </div>

            <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-4 shadow-lg shadow-black/10">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('admin.title')}</label>
                <Input value={editingPost.title || ''} onChange={e => setEditingPost({...editingPost, title: e.target.value})} className="bg-background/50 text-base font-serif h-10" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('admin.excerpt')}</label>
                <Textarea value={editingPost.excerpt || ''} onChange={e => setEditingPost({...editingPost, excerpt: e.target.value})} className="bg-background/50 min-h-[72px] resize-none text-sm rounded-xl" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground block">{t('admin.coverUrl')}</label>
                  <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-full border border-border/40">
                    <button
                      type="button"
                      onClick={() => setCoverMode('url')}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all ${coverMode === 'url' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {t('admin.coverModeUrl')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverMode('upload')}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all ${coverMode === 'upload' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {t('admin.coverModeUpload')}
                    </button>
                  </div>
                </div>
                {coverMode === 'url' ? (
                  <Input value={editingPost.coverImageUrl || ''} onChange={e => setEditingPost({...editingPost, coverImageUrl: e.target.value})} className="bg-background/50 text-sm h-9" placeholder="https://..." />
                ) : (
                  <>
                    <input
                      ref={coverFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleCoverFile(e.target.files)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => coverFileInputRef.current?.click()}
                      disabled={uploadingCover}
                      className="rounded-full gap-2 h-9 text-sm w-full"
                    >
                      {uploadingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                      {t('admin.coverUploadBtn')}
                    </Button>
                  </>
                )}
              </div>
              {editingPost.coverImageUrl && (
                <div className="rounded-xl overflow-hidden border border-border/40 h-40 relative group">
                  <img src={attachmentSrc(editingPost.coverImageUrl)} alt="Cover preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <button
                    type="button"
                    onClick={() => setEditingPost({...editingPost, coverImageUrl: ''})}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('admin.attachments')}</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                  className="hidden"
                  onChange={e => handleAddFiles(e.target.files)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="rounded-full gap-2 h-9 text-sm"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                  {uploading ? t('admin.uploading') : t('admin.addFiles')}
                </Button>
                {editingPost.attachments?.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {editingPost.attachments.map((a: PostAttachment, i: number) => (
                      <div key={i} className="relative group rounded-xl border border-border/40 overflow-hidden bg-muted/40">
                        {a.type === 'image' ? (
                          <img src={attachmentSrc(a.url)} alt={a.name || ''} className="w-full h-24 object-cover" />
                        ) : a.type === 'video' ? (
                          <div className="w-full h-24 flex items-center justify-center bg-black/80 text-white"><Film className="w-6 h-6" /></div>
                        ) : (
                          <div className="w-full h-24 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div>
                        )}
                        <div className="px-2 py-1.5 text-[10px] truncate text-muted-foreground">{a.name || a.url.split('/').pop()}</div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(i)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-background/90 text-destructive opacity-0 group-hover:opacity-100 transition-opacity border border-border/50"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('admin.content_text')}</label>
                <Textarea value={editingPost.content || ''} onChange={e => setEditingPost({...editingPost, content: e.target.value})} className="bg-background/50 min-h-[260px] font-mono text-sm rounded-xl resize-y" />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="published"
                  checked={editingPost.published || false}
                  onChange={e => setEditingPost({...editingPost, published: e.target.checked})}
                  className="w-4 h-4 rounded border-border text-primary accent-primary"
                />
                <label htmlFor="published" className="text-sm font-medium cursor-pointer">{t('admin.published')}</label>
              </div>
            </div>
          </div>

          {/* Inline preview column (non-fullscreen, visible when showPreview=true) */}
          {showPreview && !previewFullscreen && (
            <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-lg shadow-black/10 lg:sticky lg:top-20 max-h-[calc(100vh-6rem)] flex flex-col">
              {previewPanelContent}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SectionHeader icon={FileText} title={t('admin.posts')} />
        <Button onClick={() => setEditingPost({ title: '', excerpt: '', content: '', published: false })} className="rounded-full gap-1.5 text-sm h-9">
          <Plus className="w-3.5 h-3.5" />
          {t('admin.newPost')}
        </Button>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border/50 rounded-2xl">
          <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/25" />
          <p className="text-muted-foreground font-serif text-base">{t('admin.noItems')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border/40 rounded-2xl overflow-hidden flex flex-col hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group card-hover"
            >
              {resolvePostCover(post) ? (
                <div className="h-36 overflow-hidden relative bg-muted">
                  <img
                    src={resolvePostCover(post) ?? undefined}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                    }}
                  />
                  <div className="absolute top-2 right-2">
                    <StatusBadge published={post.published} />
                  </div>
                </div>
              ) : (
                <div className="h-12 bg-gradient-to-r from-primary/8 via-accent/15 to-transparent relative flex items-center px-3">
                  <StatusBadge published={post.published} />
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col">
                <h4 className="text-base font-serif font-bold mb-1.5 line-clamp-2 leading-snug group-hover:text-primary transition-colors">{post.title}</h4>
                {post.excerpt && <p className="text-muted-foreground text-xs line-clamp-2 mb-3 leading-relaxed">{post.excerpt}</p>}
                <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/30">
                  <span className="text-xs text-muted-foreground">{parseApiDate(post.createdAt).toLocaleDateString()}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingPost(post)} className="h-7 w-7 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-lg transition-all">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)} className="h-7 w-7 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Hadiths Manager ───────────────────────────────────────────────────────────
const HADITH_GRADES = ['sahih', 'hasan', 'daif', 'mawdu'] as const;

const GRADE_COLORS: Record<string, string> = {
  sahih: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  hasan: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  daif: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  mawdu: 'bg-destructive/10 text-destructive border-destructive/20',
};

function HadithsManager() {
  const { data: hadiths = [], isLoading, refetch } = useListMyHadiths();
  const create = useCreateHadith();
  const update = useUpdateHadith();
  const remove = useDeleteHadith();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [editingHadith, setEditingHadith] = useState<any>(null);

  if (isLoading) return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const gradeLabel = (grade: string) => t(`admin.grade${grade.charAt(0).toUpperCase()}${grade.slice(1)}`);

  const handleSave = async () => {
    if (!editingHadith.text) {
      toast({ title: 'Error', description: t('admin.hadithText') + ' required', variant: 'destructive' });
      return;
    }
    try {
      if (editingHadith.id) {
        await update.mutateAsync({ id: editingHadith.id, data: editingHadith });
      } else {
        await create.mutateAsync({ data: editingHadith });
      }
      toast({ title: '✓' });
      setEditingHadith(null);
      refetch();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('admin.delete') + '?')) return;
    try {
      await remove.mutateAsync({ id });
      refetch();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (editingHadith !== null) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setEditingHadith(null)} className="rounded-full gap-1.5 text-sm h-9 -ml-2">
              <ChevronLeft className="w-4 h-4" />
              {t('admin.back')}
            </Button>
            <h3 className="text-base font-serif font-bold">{editingHadith.id ? t('admin.edit') : t('admin.newHadith')}</h3>
          </div>
          <Button onClick={handleSave} disabled={create.isPending || update.isPending} className="rounded-full gap-2 h-9 text-sm">
            {create.isPending || update.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {t('admin.save')}
          </Button>
        </div>

        <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-4 shadow-lg shadow-black/10">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('admin.hadithText')}</label>
            <Textarea value={editingHadith.text || ''} onChange={e => setEditingHadith({...editingHadith, text: e.target.value})} className="bg-background/50 min-h-[160px] font-serif text-base rounded-xl resize-y" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('admin.hadithGrade')}</label>
            <div className="flex flex-wrap gap-2">
              {HADITH_GRADES.map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => setEditingHadith({ ...editingHadith, grade })}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition-all ${
                    editingHadith.grade === grade
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                      : 'bg-muted/40 text-muted-foreground border-border/40 hover:text-foreground hover:border-border'
                  }`}
                >
                  {gradeLabel(grade)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('admin.hadithNarrator')}</label>
            <Input value={editingHadith.narrator || ''} onChange={e => setEditingHadith({...editingHadith, narrator: e.target.value})} className="bg-background/50 text-sm h-9" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('admin.hadithSource')}</label>
            <Input value={editingHadith.source || ''} onChange={e => setEditingHadith({...editingHadith, source: e.target.value})} className="bg-background/50 text-sm h-9" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('admin.hadithTopic')}</label>
            <Input value={editingHadith.topic || ''} onChange={e => setEditingHadith({...editingHadith, topic: e.target.value})} className="bg-background/50 text-sm h-9" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SectionHeader icon={ScrollText} title={t('admin.hadiths')} />
        <Button onClick={() => setEditingHadith({ text: '', grade: 'sahih', narrator: '', source: '', topic: '' })} className="rounded-full gap-1.5 text-sm h-9">
          <Plus className="w-3.5 h-3.5" />
          {t('admin.newHadith')}
        </Button>
      </div>

      {hadiths.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border/50 rounded-2xl">
          <ScrollText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/25" />
          <p className="text-muted-foreground font-serif text-base">{t('admin.noItems')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hadiths.map((hadith, idx) => (
            <motion.div
              key={hadith.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="bg-card border border-border/40 rounded-2xl overflow-hidden flex flex-col hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group p-5 card-hover"
            >
              <span className={`inline-flex self-start px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border mb-3 ${GRADE_COLORS[hadith.grade] ?? 'bg-primary/10 text-primary border-primary/30'}`}>
                {gradeLabel(hadith.grade)}
              </span>
              <p className="text-sm font-serif line-clamp-4 mb-3 leading-relaxed flex-1">{hadith.text}</p>
              <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/30">
                <span className="text-xs text-muted-foreground truncate">{hadith.source || hadith.narrator || ''}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditingHadith(hadith)} className="h-7 w-7 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-lg transition-all">
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(hadith.id)} className="h-7 w-7 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Admins Manager ────────────────────────────────────────────────────────────
type AdminPendingAction =
  | { type: 'grant'; id: number; name: string }
  | { type: 'revoke'; id: number; name: string }
  | { type: 'transfer'; id: number; name: string }
  | { type: 'remove'; id: number; name: string };

function AdminsManager() {
  const { data: me } = useGetMe();
  const { data: admins = [], isLoading, refetch } = useListAdmins();
  const create = useCreateAdmin();
  const remove = useDeleteAdmin();
  const updateRole = useUpdateAdminRole();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [newAdmin, setNewAdmin] = useState({ email: '', role: 'editor' as 'editor' | 'owner' });
  const [pending, setPending] = useState<AdminPendingAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  if (isLoading) return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const handleInvite = async () => {
    if (!newAdmin.email) return;
    try {
      await create.mutateAsync({ data: newAdmin });
      toast({ title: '✓', description: newAdmin.email });
      setNewAdmin({ email: '', role: 'editor' });
      refetch();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleConfirm = async () => {
    if (!pending) return;
    const p = pending;
    setPending(null);
    setActionLoading(true);
    try {
      if (p.type === 'remove') {
        await remove.mutateAsync({ id: p.id });
      } else if (p.type === 'grant') {
        await updateRole.mutateAsync({ id: p.id, data: { role: 'owner' } });
      } else if (p.type === 'revoke') {
        await updateRole.mutateAsync({ id: p.id, data: { role: 'editor' } });
      } else if (p.type === 'transfer') {
        await clerkFetch(`/api/admins/${p.id}/role`, {
          method: 'PATCH',
          body: JSON.stringify({ role: 'owner', transferOwnership: true }),
        });
      }
      toast({ title: '✓' });
      refetch();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const isMeOwner = me?.role === 'owner';

  const dialogConfig = pending ? (() => {
    switch (pending.type) {
      case 'grant': return {
        title: t('admin.grantAdmin'),
        description: t('admin.confirmGrantAdmin') + ` "${pending.name}"`,
        label: t('admin.grantAdmin'),
        variant: 'default' as const,
      };
      case 'revoke': return {
        title: t('admin.revokeAdmin'),
        description: t('admin.confirmRevokeAdmin') + ` "${pending.name}"`,
        label: t('admin.revokeAdmin'),
        variant: 'destructive' as const,
      };
      case 'transfer': return {
        title: t('admin.transferOwner'),
        description: t('admin.confirmTransferOwner') + ` "${pending.name}"`,
        label: t('admin.transferOwner'),
        variant: 'destructive' as const,
      };
      case 'remove': return {
        title: t('admin.delete'),
        description: t('admin.confirmRemoveAdmin') + ` "${pending.name}"`,
        label: t('admin.delete'),
        variant: 'destructive' as const,
      };
    }
  })() : null;

  return (
    <div className="space-y-7">
      {pending && dialogConfig && (
        <ConfirmDialog
          open={!!pending}
          title={dialogConfig.title}
          description={dialogConfig.description}
          confirmLabel={dialogConfig.label}
          confirmVariant={dialogConfig.variant}
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
        />
      )}

      <SectionHeader icon={Shield} title={t('admin.admins')} />

      {isMeOwner && (
        <div className="p-4 rounded-2xl bg-primary/6 border border-primary/15 flex gap-3 items-start">
          <Crown className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-foreground/75">
            <span className="font-bold text-primary">{t('admin.youOwner')}</span>{' '}
            {t('admin.ownerDesc')}
          </p>
        </div>
      )}

      {isMeOwner && (
        <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-lg shadow-black/10">
          <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            {t('admin.inviteAdmin')}
          </h4>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              value={newAdmin.email}
              onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
              placeholder={t('admin.inviteEmail')}
              className="bg-background/50 text-sm h-9 flex-1"
              onKeyDown={e => { if (e.key === 'Enter') handleInvite(); }}
            />
            <Select value={newAdmin.role} onValueChange={(v: any) => setNewAdmin({...newAdmin, role: v})}>
              <SelectTrigger className="bg-background/50 h-9 text-sm w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">{t('admin.roleEditor')}</SelectItem>
                <SelectItem value="owner">{t('admin.roleOwner')}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleInvite} disabled={!newAdmin.email || create.isPending} className="rounded-full gap-1.5 text-sm h-9 flex-shrink-0">
              {create.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {t('admin.invite')}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border/40 bg-card/30 overflow-hidden shadow-lg shadow-black/10">
        <div className="px-4 py-3 border-b border-border/40 bg-muted/10 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            {t('admin.admins')}
          </span>
          <span className="text-xs font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">{admins.length}</span>
        </div>
        <div className="divide-y divide-border/30">
          {admins.map((admin, idx) => {
            const isCurrentMe = me?.id === admin.id;
            const isAdminOwner = admin.role === 'owner';

            return (
              <motion.div
                key={admin.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`flex items-center gap-3 px-4 py-3.5 transition-colors group ${
                  isCurrentMe
                    ? 'bg-primary/4'
                    : 'hover:bg-muted/15'
                }`}
              >
                <div className={`w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 ${
                  isAdminOwner
                    ? 'bg-primary/10 border-primary/30 glow-gold-sm'
                    : 'bg-muted/40 border-border/50'
                }`}>
                  {isAdminOwner
                    ? <Crown className="w-4 h-4 text-primary" />
                    : <Shield className="w-4 h-4 text-muted-foreground" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {admin.name || admin.email}
                    </span>
                    {isCurrentMe && (
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                        (you)
                      </span>
                    )}
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      isAdminOwner
                        ? 'bg-primary/10 text-primary border-primary/25'
                        : 'bg-muted/60 text-muted-foreground border-border/50'
                    }`}>
                      {isAdminOwner ? t('admin.roleOwner') : t('admin.roleEditor')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{admin.email}</p>
                </div>

                {isMeOwner && !isCurrentMe && (
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                    {!isAdminOwner ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPending({ type: 'grant', id: admin.id, name: admin.name || admin.email })}
                        disabled={actionLoading}
                        className="h-8 rounded-lg text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 gap-1.5 px-2.5 transition-all"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t('admin.grantAdmin')}</span>
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPending({ type: 'revoke', id: admin.id, name: admin.name || admin.email })}
                          disabled={actionLoading}
                          className="h-8 rounded-lg text-xs text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 gap-1.5 px-2.5 transition-all"
                        >
                          <ShieldOff className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{t('admin.revokeAdmin')}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPending({ type: 'transfer', id: admin.id, name: admin.name || admin.email })}
                          disabled={actionLoading}
                          className="h-8 rounded-lg text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 gap-1.5 px-2.5 transition-all"
                        >
                          <Crown className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{t('admin.transferOwner')}</span>
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPending({ type: 'remove', id: admin.id, name: admin.name || admin.email })}
                      disabled={actionLoading}
                      className="h-8 w-8 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
