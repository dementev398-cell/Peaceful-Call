import { parseApiDate } from "@/lib/date";
import { PageTransition } from '@/components/PageTransition';
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
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
  type ContentItem,
  type PostAttachment
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
  Loader2, LogOut, Plus, Trash2, Edit2, Check, X,
  Mail, MailOpen, Reply, MessageCircle, Crown, Shield,
  ShieldAlert, LogIn, Users, Ban,
  ChevronLeft, FileText, Settings, LayoutDashboard,
  ScrollText, Paperclip, Film, Camera, ShieldCheck, ShieldOff
} from 'lucide-react';
import { useClerk, useUser } from '@clerk/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentDict } from '@/hooks/use-content';
import { attachmentSrc, getAttachmentType, resolvePostCover } from '@/lib/storage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';

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
        <Button variant="outline" onClick={() => signOut().then(() => setLocation('/'))} className="w-full h-11 rounded-full">
          {t('admin.signOut')}
        </Button>
      </AdminGateShell>
    );
  }

  const isOwner = user.role === 'owner';
  const tabs = isOwner
    ? ['content', 'posts', 'hadiths', 'messages', 'users', 'admins']
    : ['posts', 'hadiths', 'messages'];

  const roleLabel = isOwner
    ? (language === 'RU' ? 'Владелец' : language === 'AR' ? 'مالك' : 'Owner')
    : (language === 'RU' ? 'Редактор' : language === 'AR' ? 'محرر' : 'Editor');

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col gradient-bg">
      {/* Header */}
      <header className="border-b border-primary/10 bg-card/70 backdrop-blur-xl sticky top-0 z-20 shadow-sm shadow-primary/5">
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
            <span className="text-xs text-muted-foreground hidden md:block truncate max-w-[180px]">{user.email}</span>
            <AdminAvatarWidget adminId={user.id ?? 0} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut().then(() => setLocation('/'))}
              className="gap-1.5 text-muted-foreground hover:text-foreground hover:text-destructive h-9 rounded-xl border border-transparent hover:border-destructive/30 hover:bg-destructive/8 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs font-semibold">{t('admin.signOut')}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
        <Tabs defaultValue={tabs[0]} className="w-full" dir="ltr">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-8 pb-2">
            <TabsList className="inline-flex bg-card/40 glass border border-border/30 p-1.5 rounded-2xl gap-1 min-w-max shadow-inner">
              {isOwner && (
                <TabsTrigger value="content" className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:glow-gold-sm whitespace-nowrap px-4 py-2.5 gap-2 transition-all font-semibold text-muted-foreground data-[state=active]:font-bold">
                  <Settings className="w-4 h-4" />
                  {t('admin.content')}
                </TabsTrigger>
              )}
              <TabsTrigger value="posts" className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:glow-gold-sm whitespace-nowrap px-4 py-2.5 gap-2 transition-all font-semibold text-muted-foreground data-[state=active]:font-bold">
                <FileText className="w-4 h-4" />
                {t('admin.posts')}
              </TabsTrigger>
              <TabsTrigger value="hadiths" className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:glow-gold-sm whitespace-nowrap px-4 py-2.5 gap-2 transition-all font-semibold text-muted-foreground data-[state=active]:font-bold">
                <ScrollText className="w-4 h-4" />
                {t('admin.hadiths')}
              </TabsTrigger>
              <TabsTrigger value="messages" className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:glow-gold-sm whitespace-nowrap px-4 py-2.5 gap-2 relative transition-all font-semibold text-muted-foreground data-[state=active]:font-bold">
                <MessageCircle className="w-4 h-4" />
                {t('admin.messages')}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold shadow-sm ring-2 ring-background">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
              {isOwner && (
                <TabsTrigger value="users" className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:glow-gold-sm whitespace-nowrap px-4 py-2.5 gap-2 transition-all font-semibold text-muted-foreground data-[state=active]:font-bold">
                  <Users className="w-4 h-4" />
                  {t('admin.users')}
                </TabsTrigger>
              )}
              {isOwner && (
                <TabsTrigger value="admins" className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:glow-gold-sm whitespace-nowrap px-4 py-2.5 gap-2 transition-all font-semibold text-muted-foreground data-[state=active]:font-bold">
                  <Shield className="w-4 h-4" />
                  {t('admin.admins')}
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {isOwner && (
            <TabsContent value="content" className="mt-0">
              <ContentManager />
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const logoImg = dict['site.logo'] || '/logo-source.jpg';
  // Find current admin in the list to get avatarUrl
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
      toast({ title: '✓', description: 'Аватар обновлён' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    try {
      await updateAvatar.mutateAsync({ data: { avatarUrl: null } });
      toast({ title: '✓', description: 'Аватар удалён' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
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
          title="Изменить аватар"
        >
          <Camera className="w-3 h-3" />
        </Button>
        {meAdmin?.avatarUrl && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground/50 hover:text-destructive rounded-lg"
            onClick={handleRemove}
            title="Удалить аватар"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
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
      {/* Confirm Dialog */}
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
        <div>
          <h3 className="text-xl font-serif font-bold">{t('admin.userMgmt')}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t('admin.userMgmtDesc')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading} className="rounded-full text-xs gap-1.5 h-8">
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
        <div className="rounded-2xl border border-border/40 bg-card/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 bg-muted/10 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('admin.userMgmt')}
            </span>
            <span className="text-xs text-muted-foreground">{users.length}</span>
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

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const { data: thread, refetch: refetchThread } = useGetMessage(selectedId!, {
    query: { queryKey: getGetMessageQueryKey(selectedId!), enabled: selectedId !== null }
  });

  const handleSelect = async (id: number) => {
    setSelectedId(id);
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
      if (selectedId === id) setSelectedId(null);
      refetch();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (isLoading) return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <h3 className="text-xl font-serif font-bold">{t('admin.messages')}</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[480px]">
        {/* Inbox */}
        <div className="md:col-span-1 bg-card border border-border/50 rounded-2xl overflow-hidden flex flex-col">
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

        {/* Thread */}
        <div className="md:col-span-2 bg-card border border-border/50 rounded-2xl flex flex-col overflow-hidden">
          {!selectedId || !thread ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
              <div className="text-center">
                <Mail className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-serif text-sm">{t('admin.selectMsg')}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-5 border-b border-border/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-base">{thread.message.subject || t('admin.noSubject')}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('admin.from')}: <span className="text-foreground font-medium">{thread.message.senderName}</span>
                      {thread.message.senderEmail && ` <${thread.message.senderEmail}>`}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {parseApiDate(thread.message.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {userRole === 'owner' && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(thread.message.id)} className="text-muted-foreground hover:text-destructive h-8 w-8 flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3 max-h-[280px]">
                <div className="bg-muted/40 rounded-xl p-4">
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
                <Button onClick={handleReply} disabled={!replyText.trim() || reply.isPending} className="rounded-full gap-2 text-sm h-9">
                  {reply.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Reply className="w-3.5 h-3.5" />}
                  {t('admin.sendReply')}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Content Manager ──────────────────────────────────────────────────────────
function ContentManager() {
  const { data: contentItems = [], isLoading, refetch } = useListContent();
  const upsert = useUpsertContent();
  const remove = useDeleteContent();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [editedItems, setEditedItems] = useState<Record<string, ContentItem>>({});
  const [addingNew, setAddingNew] = useState(false);
  const [newItem, setNewItem] = useState({ label: '', value: '', type: 'text' as const, group: 'Site' });

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
      toast({ title: '✓', description: language === 'AR' ? 'تم الحفظ' : language === 'RU' ? 'Сохранено успешно' : 'Saved successfully' });
      setEditedItems({});
      await refetch();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddNew = async () => {
    if (!newItem.label || !newItem.value) {
      toast({ title: 'Error', description: 'Label and value are required', variant: 'destructive' });
      return;
    }
    const key = newItem.group.toLowerCase().replace(/\s+/g, '.') + '.' + newItem.label.toLowerCase().replace(/\s+/g, '_');
    try {
      await upsert.mutateAsync({ data: { items: [{ key, group: newItem.group, label: newItem.label, type: newItem.type, value: newItem.value }] } });
      toast({ title: '✓' });
      setNewItem({ label: '', value: '', type: 'text', group: 'Site' });
      setAddingNew(false);
      await refetch();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm(t('admin.delete') + '?')) return;
    try {
      await remove.mutateAsync({ key });
      await refetch();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-xl font-serif font-bold">{t('admin.contentMgmt')}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t('admin.contentDesc')}</p>
        </div>
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

      {/* Add new form */}
      {addingNew && (
        <div className="bg-card border border-primary/20 rounded-2xl p-5 space-y-4">
          <h4 className="text-sm font-bold text-primary">{t('admin.addNew')}</h4>
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

      {/* Groups */}
      <div className="space-y-7">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="space-y-3">
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border/40 pb-2">{group}</h4>
            <div className="space-y-2">
              {items.map(item => {
                const isEdited = editedItems[item.key] !== undefined;
                const currentItem = isEdited ? editedItems[item.key] : item;
                const handleChange = (val: string) => {
                  setEditedItems(prev => ({ ...prev, [item.key]: { ...item, value: val } }));
                };
                return (
                  <div key={item.key} className={`flex gap-3 p-4 rounded-xl border items-start transition-colors ${isEdited ? 'border-primary/30 bg-primary/4' : 'border-border/40 bg-card/50 hover:border-border'}`}>
                    <div className="w-1/3 flex flex-col justify-center min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">{item.label || item.key}</span>
                      <span className="text-[10px] text-muted-foreground/60 font-mono truncate mt-0.5">{item.key}</span>
                    </div>
                    <div className="w-2/3 flex gap-2 min-w-0">
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
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.key)} className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 flex-shrink-0 h-9 w-9 rounded-lg">
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

// ── Posts Manager ─────────────────────────────────────────────────────────────
function PostsManager() {
  const { data: posts = [], isLoading, refetch } = useListMyPosts();
  const create = useCreatePost();
  const update = useUpdatePost();
  const remove = useDeletePost();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [editingPost, setEditingPost] = useState<any>(null);
  const requestUploadUrl = useRequestUploadUrl();
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverMode, setCoverMode] = useState<'url' | 'upload'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

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

  if (editingPost !== null) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setEditingPost(null)} className="rounded-full gap-1.5 text-sm h-9 -ml-2">
              <ChevronLeft className="w-4 h-4" />
              {t('admin.back')}
            </Button>
            <h3 className="text-base font-serif font-bold">{editingPost.id ? t('admin.edit') : t('admin.newPost')}</h3>
          </div>
          <Button onClick={handleSave} disabled={create.isPending || update.isPending} className="rounded-full gap-2 h-9 text-sm">
            {create.isPending || update.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {t('admin.save')}
          </Button>
        </div>

        <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-4">
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
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-serif font-bold">{t('admin.posts')}</h3>
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
            <div key={post.id} className="bg-card border border-border/40 rounded-2xl overflow-hidden flex flex-col hover:border-border transition-colors group">
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
                  {!post.published && (
                    <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm text-[10px] font-bold px-2 py-0.5 rounded-full border border-border">
                      {t('admin.draft')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-12 bg-gradient-to-r from-primary/8 via-accent/15 to-transparent relative">
                  {!post.published && (
                    <span className="absolute top-2 left-3 text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {t('admin.draft')}
                    </span>
                  )}
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col">
                <h4 className="text-base font-serif font-bold mb-1.5 line-clamp-2 leading-snug">{post.title}</h4>
                {post.excerpt && <p className="text-muted-foreground text-xs line-clamp-2 mb-3 leading-relaxed">{post.excerpt}</p>}
                <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/30">
                  <span className="text-xs text-muted-foreground">{parseApiDate(post.createdAt).toLocaleDateString()}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingPost(post)} className="h-7 w-7 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-lg">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)} className="h-7 w-7 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Hadiths Manager ───────────────────────────────────────────────────────────
const HADITH_GRADES = ['sahih', 'hasan', 'daif', 'mawdu'] as const;

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

        <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-4">
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
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/40 text-muted-foreground border-border/40 hover:text-foreground'
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-serif font-bold">{t('admin.hadiths')}</h3>
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
          {hadiths.map((hadith) => (
            <div key={hadith.id} className="bg-card border border-border/40 rounded-2xl overflow-hidden flex flex-col hover:border-border transition-colors group p-5">
              <span className="inline-flex self-start px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border border-primary/30 text-primary bg-primary/10 mb-3">
                {gradeLabel(hadith.grade)}
              </span>
              <p className="text-sm font-serif line-clamp-4 mb-3 leading-relaxed">{hadith.text}</p>
              <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/30">
                <span className="text-xs text-muted-foreground truncate">{hadith.source || hadith.narrator || ''}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditingHadith(hadith)} className="h-7 w-7 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-lg">
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(hadith.id)} className="h-7 w-7 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
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
      {/* Confirm Dialog */}
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

      {isMeOwner && (
        <div className="p-4 rounded-2xl bg-primary/6 border border-primary/15 flex gap-3 items-start">
          <Crown className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-foreground/75">
            <span className="font-bold text-primary">{t('admin.youOwner')}</span>{' '}
            {t('admin.ownerDesc')}
          </p>
        </div>
      )}

      {/* Invite form */}
      {isMeOwner && (
        <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm">
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

      {/* Admins list */}
      <div className="rounded-2xl border border-border/40 bg-card/30 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border/40 bg-muted/10 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            {t('admin.admins')}
          </span>
          <span className="text-xs text-muted-foreground">{admins.length}</span>
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
                {/* Role icon */}
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

                {/* Actions — only owner sees these, and not for themselves */}
                {isMeOwner && !isCurrentMe && (
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                    {!isAdminOwner ? (
                      // Editor → grant admin / promote
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
                      // Owner → revoke / transfer
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
