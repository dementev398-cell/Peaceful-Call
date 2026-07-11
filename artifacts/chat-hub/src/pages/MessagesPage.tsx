import { parseApiDate } from "@/lib/date";
import { PageTransition } from '@/components/PageTransition';
import { useState, useRef, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { 
  useListConversations, 
  useListChatMessages, 
  useSendChatMessage, 
  useStartSupportConversation,
  useListChatUsers,
  useStartDirectConversation,
  useMarkConversationRead,
  useGetMe,
  useDeleteChatMessage,
  useEditChatMessage,
  getListConversationsQueryKey,
  getListChatMessagesQueryKey,
} from "@workspace/api-client-react";
import type { ChatMessage } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Search, Send, FilePlus, Paperclip, X, Download, FileText, UserCircle, MessageCircle, Shield, Eye, ArrowLeft, MoreHorizontal, Trash2, Pencil, Check } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { useRequestUploadUrl } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSearch } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

// Super-admin: fetch any user's conversations via custom API call
async function fetchAdminUserConversations(clerkUserId: string) {
  const res = await fetch(`/api/chat/admin/users/${encodeURIComponent(clerkUserId)}/conversations`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Forbidden');
  return res.json();
}

async function fetchAdminConversationMessages(conversationId: number) {
  const res = await fetch(`/api/chat/admin/conversations/${conversationId}/messages`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Forbidden');
  return res.json();
}

export default function MessagesPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const search = useSearch();
  const queryClient = useQueryClient();
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [convSearch, setConvSearch] = useState('');

  // Super-admin: viewing another user's chats
  const [adminViewClerkId, setAdminViewClerkId] = useState<string | null>(null);
  const [adminViewConvs, setAdminViewConvs] = useState<any[]>([]);
  const [adminViewLoading, setAdminViewLoading] = useState(false);
  const [adminViewConvId, setAdminViewConvId] = useState<number | null>(null);

  const { data: me } = useGetMe();
  const isSuperAdmin = me?.role === 'owner';
  
  const { data: conversations = [], isLoading: loadingConvs, refetch: refetchConvs } = useListConversations({
    query: { refetchInterval: 15000 } as any // poll for new conversations/messages
  });
  const markRead = useMarkConversationRead();

  // Deep-link support: /messages?conv=<id>
  useEffect(() => {
    const convParam = new URLSearchParams(search).get('conv');
    if (convParam) {
      const id = Number(convParam);
      if (!Number.isNaN(id)) setActiveConvId(id);
    }
  }, [search]);

  const handleSelectConv = (id: number) => {
    setActiveConvId(id);
    const conv = conversations.find(c => c.id === id);
    if (conv?.unread) {
      markRead.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        }
      });
    }
  };

  // Filter conversations by search query (by title/email)
  const filteredConversations = convSearch.trim()
    ? conversations.filter(c => {
        const haystack = `${c.title} ${c.lastMessagePreview ?? ''}`.toLowerCase();
        return haystack.includes(convSearch.toLowerCase());
      })
    : conversations;

  // Super-admin: load conversations for a user
  const handleAdminViewUser = async (clerkUserId: string) => {
    setAdminViewClerkId(clerkUserId);
    setAdminViewConvId(null);
    setAdminViewLoading(true);
    try {
      const convs = await fetchAdminUserConversations(clerkUserId);
      setAdminViewConvs(Array.isArray(convs) ? convs : []);
    } catch {
      setAdminViewConvs([]);
    } finally {
      setAdminViewLoading(false);
    }
  };

  const handleExitAdminView = () => {
    setAdminViewClerkId(null);
    setAdminViewConvs([]);
    setAdminViewConvId(null);
  };

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-24 sm:py-28 max-w-7xl">
        <ScrollReveal>
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4" dir="ltr">
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">{t('messages.title')}</h1>
              <p className="text-muted-foreground text-sm font-serif">{t('messages.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2">
              {isSuperAdmin && !adminViewClerkId && (
                <SuperAdminUserPickerDialog onSelectUser={handleAdminViewUser} />
              )}
              {adminViewClerkId && (
                <Button variant="outline" onClick={handleExitAdminView} className="rounded-full gap-2">
                  <ArrowLeft className="w-4 h-4" /> Выйти из режима просмотра
                </Button>
              )}
              {!adminViewClerkId && (
                <NewConversationDialog onSelect={handleSelectConv} />
              )}
            </div>
          </div>
        </ScrollReveal>

        {adminViewClerkId ? (
          // Super-admin view: another user's chats
          <div className="bg-card/40 glass border border-amber-500/40 rounded-[2rem] overflow-hidden h-[calc(100vh-280px)] min-h-[600px] flex shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500/60 rounded-full" />
            {/* Sidebar */}
            <div className={`${adminViewConvId ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r border-border/40 bg-amber-500/5`}>
              <div className="p-4 border-b border-border/40 bg-amber-500/10">
                <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm mb-1">
                  <Eye className="w-4 h-4" /> Режим просмотра (super-admin)
                </div>
                <p className="text-xs text-muted-foreground">Вы просматриваете чаты другого пользователя</p>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {adminViewLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : adminViewConvs.length === 0 ? (
                  <div className="text-center py-10 px-4 text-muted-foreground text-sm">
                    <MessageCircle className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    У этого пользователя нет диалогов
                  </div>
                ) : (
                  adminViewConvs.map((conv: any) => (
                    <button
                      key={conv.id}
                      onClick={() => setAdminViewConvId(conv.id)}
                      className={`w-full flex items-start gap-3 p-3 rounded-2xl transition-all text-left ${adminViewConvId === conv.id ? 'bg-amber-500/20 border border-amber-500/30' : 'hover:bg-muted border border-transparent'}`}
                    >
                      <Avatar className="w-12 h-12 border border-border mt-0.5">
                        <AvatarImage src={conv.otherAvatarUrl || ''} />
                        <AvatarFallback className="bg-secondary">{conv.title.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="font-bold text-sm truncate pr-2 text-foreground">
                            {conv.kind === 'support' ? 'Администрация' : conv.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {parseApiDate(conv.lastMessageAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs truncate text-muted-foreground">
                          {conv.lastMessagePreview || 'Нет сообщений'}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
            {/* Chat Area (read-only) */}
            <div className={`${!adminViewConvId ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-background relative`}>
              {adminViewConvId ? (
                <AdminReadonlyChatThread
                  conversationId={adminViewConvId}
                  onBack={() => setAdminViewConvId(null)}
                  currentUserClerkId={user?.id ?? ''}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                  <MessageCircle className="w-10 h-10 text-muted-foreground/30 mb-4" />
                  <p className="font-serif text-xl">Выберите беседу для просмотра</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Normal user view
          <div className="bg-card/40 glass border border-border/40 rounded-[2rem] overflow-hidden h-[calc(100vh-280px)] min-h-[600px] flex shadow-2xl">
            {/* Sidebar */}
            <div className={`${activeConvId ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r border-border/40 bg-muted/10`}>
              <div className="p-5 border-b border-border/40">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по имени или email..."
                    value={convSearch}
                    onChange={e => setConvSearch(e.target.value)}
                    className="pl-10 bg-background/50 border-border/40 rounded-full h-11"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loadingConvs ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-10 px-4 text-muted-foreground text-sm">
                    <MessageCircle className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    {convSearch ? 'Беседы не найдены' : 'У вас пока нет активных диалогов'}
                  </div>
                ) : (
                  filteredConversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConv(conv.id)}
                      className={`w-full flex items-start gap-3 p-3 rounded-2xl transition-all text-left ${activeConvId === conv.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted border border-transparent'}`}
                    >
                      <div className="relative mt-0.5">
                        <Avatar className="w-12 h-12 border border-border">
                          <AvatarImage src={conv.otherAvatarUrl || ''} />
                          <AvatarFallback className={conv.kind === 'support' ? 'bg-primary/20 text-primary' : 'bg-secondary'}>
                            {conv.kind === 'support' ? 'АД' : conv.title.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {conv.unread && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary border-2 border-card" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="font-bold text-sm truncate pr-2 text-foreground">
                            {conv.kind === 'support' ? 'Администрация' : conv.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {parseApiDate(conv.lastMessageAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className={`text-xs truncate ${conv.unread ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                          {conv.lastMessagePreview || 'Нет сообщений'}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className={`${!activeConvId ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-background relative`}>
              {activeConvId ? (
                <ChatThread conversationId={activeConvId} onBack={() => setActiveConvId(null)} />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                  <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                    <MessageCircle className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                  <p className="font-serif text-xl">Выберите беседу для начала общения</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </PageTransition>
  );
}

// ── Delete Confirmation Dialog ────────────────────────────────────────────────

function DeleteConfirmDialog({
  open,
  scope,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  scope: 'me' | 'everyone';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {scope === 'everyone' ? 'Удалить у всех?' : 'Удалить у себя?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {scope === 'everyone'
              ? 'Сообщение будет удалено для всех участников беседы. Это действие необратимо.'
              : 'Сообщение будет скрыто только для вас. Собеседник по-прежнему его увидит.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={scope === 'everyone' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Message Actions Menu ──────────────────────────────────────────────────────
// On desktop: hover reveals a small floating menu
// On mobile: tap a button that appears on the message to reveal actions

type PendingDelete = { messageId: number; scope: 'me' | 'everyone' };

function MessageBubble({
  msg,
  isMe,
  showAvatar,
  conversationId,
  onOptimisticDelete,
  onOptimisticEdit,
}: {
  msg: ChatMessage;
  isMe: boolean;
  showAvatar: boolean;
  conversationId: number;
  onOptimisticDelete: (id: number, scope: 'me' | 'everyone') => void;
  onOptimisticEdit: (id: number, content: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState(msg.content ?? '');
  const menuRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const deleteMessage = useDeleteChatMessage();
  const editMessage = useEditChatMessage();

  // Determine if we can edit: sender only, not deleted, has text content
  const canEdit = isMe && !msg.isDeleted && !!msg.content && !msg.attachmentUrl;
  const canDeleteForEveryone = isMe && !msg.isDeleted;
  // Can always delete for me (hide) if not already deleted globally
  const canDeleteForMe = !msg.isDeleted;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Focus edit area when entering edit mode
  useEffect(() => {
    if (editMode && editRef.current) {
      editRef.current.focus();
      editRef.current.selectionStart = editRef.current.value.length;
    }
  }, [editMode]);

  const handleDeleteConfirm = () => {
    if (!pendingDelete) return;
    const { messageId, scope } = pendingDelete;
    // Optimistic update
    onOptimisticDelete(messageId, scope);
    deleteMessage.mutate({ id: messageId, params: { scope } });
    setPendingDelete(null);
    setMenuOpen(false);
  };

  const handleEditSave = () => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === msg.content) {
      setEditMode(false);
      return;
    }
    onOptimisticEdit(msg.id, trimmed);
    editMessage.mutate({ id: msg.id, data: { content: trimmed } });
    setEditMode(false);
  };

  const handleEditCancel = () => {
    setEditContent(msg.content ?? '');
    setEditMode(false);
  };

  const showActionsMenu = !msg.isDeleted && (canEdit || canDeleteForEveryone || canDeleteForMe);

  return (
    <>
      <DeleteConfirmDialog
        open={!!pendingDelete}
        scope={pendingDelete?.scope ?? 'me'}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
      />

      <div className={`flex gap-3 max-w-[85%] ${isMe ? 'self-end flex-row-reverse' : 'self-start'}`}>
        {!isMe && (
          <div className="w-8 shrink-0">
            {showAvatar && (
              <Avatar className="w-8 h-8">
                <AvatarImage src={msg.senderAvatarUrl || ''} />
                <AvatarFallback className="text-[10px]">{msg.senderName.charAt(0)}</AvatarFallback>
              </Avatar>
            )}
          </div>
        )}

        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
          {showAvatar && (
            <span className="text-xs text-muted-foreground mb-1 ml-1 font-medium flex items-center gap-1">
              {msg.senderName}
              {msg.senderIsAdmin === 'true' && (
                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">Админ</span>
              )}
            </span>
          )}

          {/* Message bubble + hover/tap actions */}
          <div
            ref={menuRef}
            className={`relative group flex items-center gap-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Desktop: fade-in action button on hover */}
            {showActionsMenu && (
              <div
                className={`
                  shrink-0 flex items-center
                  opacity-0 group-hover:opacity-100 transition-opacity
                  ${isMe ? 'mr-1' : 'ml-1'}
                `}
              >
                <button
                  onClick={() => setMenuOpen(v => !v)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Действия с сообщением"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mobile: always-visible tap target (small dot), only shown on touch */}
            {showActionsMenu && (
              <div
                className={`
                  shrink-0 flex items-center
                  sm:hidden
                  ${isMe ? 'mr-1' : 'ml-1'}
                `}
              >
                <button
                  onClick={() => setMenuOpen(v => !v)}
                  className="w-10 h-10 flex items-center justify-center rounded-full active:bg-muted text-muted-foreground transition-colors"
                  aria-label="Действия с сообщением"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Bubble */}
            <div className={`rounded-2xl px-4 py-2.5 ${
              isMe
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : 'bg-muted rounded-tl-sm border border-border/50 text-foreground'
            }`}>
              {msg.isDeleted ? (
                <p className="text-sm italic opacity-60">Сообщение удалено</p>
              ) : editMode ? (
                <div className="flex flex-col gap-2 min-w-[180px]">
                  <textarea
                    ref={editRef}
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(); }
                      if (e.key === 'Escape') handleEditCancel();
                    }}
                    className="w-full bg-transparent border-0 outline-none resize-none text-sm leading-relaxed text-inherit placeholder:opacity-50 min-h-[40px] max-h-[120px]"
                    rows={2}
                  />
                  <div className="flex gap-1.5 justify-end">
                    <button
                      onClick={handleEditCancel}
                      className="text-[11px] px-2 py-1 rounded opacity-70 hover:opacity-100 transition-opacity"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleEditSave}
                      disabled={editMessage.isPending}
                      className="text-[11px] px-2 py-1 rounded bg-white/20 hover:bg-white/30 transition-colors flex items-center gap-1"
                    >
                      {editMessage.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Сохранить
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {msg.content && <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                  {msg.attachmentUrl && (
                    <AttachmentPreview
                      url={`${import.meta.env.BASE_URL}api/storage${msg.attachmentUrl}`}
                      type={msg.attachmentType}
                      name={msg.attachmentName || 'Файл'}
                      size={msg.attachmentSize ?? null}
                      isMe={isMe}
                    />
                  )}
                </>
              )}
            </div>

            {/* Dropdown actions menu */}
            {menuOpen && (
              <div
                className={`
                  absolute z-30 top-full mt-1 bg-popover border border-border rounded-xl shadow-lg py-1 min-w-[180px]
                  ${isMe ? 'right-10' : 'left-10'}
                `}
              >
                {canEdit && (
                  <button
                    onClick={() => { setEditMode(true); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground shrink-0" />
                    Редактировать
                  </button>
                )}
                {canDeleteForEveryone && (
                  <button
                    onClick={() => { setPendingDelete({ messageId: msg.id, scope: 'everyone' }); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                    Удалить у всех
                  </button>
                )}
                {canDeleteForMe && (
                  <button
                    onClick={() => { setPendingDelete({ messageId: msg.id, scope: 'me' }); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors text-left"
                  >
                    <Trash2 className="w-4 h-4 shrink-0 opacity-70" />
                    Удалить у себя
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 mt-1">
            {msg.isEdited && !msg.isDeleted && (
              <span className="text-[10px] text-muted-foreground opacity-60 italic">(изменено)</span>
            )}
            <span className="text-[10px] text-muted-foreground opacity-60">
              {parseApiDate(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

function ChatThread({ conversationId, onBack }: { conversationId: number, onBack: () => void }) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [pendingUpload, setPendingUpload] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Local optimistic messages state (a patched overlay on top of server data)
  const [localMessages, setLocalMessages] = useState<ChatMessage[] | null>(null);
  
  // Polling for new messages
  const { data: serverMessages = [], isLoading } = useListChatMessages(conversationId, {
    query: { refetchInterval: 5000 } as any
  });

  // Keep localMessages in sync: on each server refresh, merge in any optimistic edits/deletes
  useEffect(() => {
    setLocalMessages(null);
  }, [serverMessages]);

  const messages: ChatMessage[] = localMessages ?? serverMessages;

  const sendMessage = useSendChatMessage();
  const requestUploadUrl = useRequestUploadUrl();
  const [isUploading, setIsUploading] = useState(false);

  const invalidateMessages = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListChatMessagesQueryKey(conversationId) });
    queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
  }, [queryClient, conversationId]);

  // Optimistic delete
  const handleOptimisticDelete = useCallback((id: number, scope: 'me' | 'everyone') => {
    setLocalMessages(prev => {
      const base = prev ?? serverMessages;
      if (scope === 'everyone') {
        return base.map(m => m.id === id ? { ...m, isDeleted: true, content: null, attachmentUrl: null } : m);
      } else {
        // scope=me: hide from local view
        return base.filter(m => m.id !== id);
      }
    });
    // Also schedule a refetch after mutation settles
    setTimeout(invalidateMessages, 800);
  }, [serverMessages, invalidateMessages]);

  // Optimistic edit
  const handleOptimisticEdit = useCallback((id: number, newContent: string) => {
    setLocalMessages(prev => {
      const base = prev ?? serverMessages;
      return base.map(m => m.id === id ? { ...m, content: newContent, isEdited: true } : m);
    });
    setTimeout(invalidateMessages, 800);
  }, [serverMessages, invalidateMessages]);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const { uploadURL, objectPath } = await requestUploadUrl.mutateAsync({
        data: { name: file.name, size: file.size, contentType: file.type }
      });
      await fetch(uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      const attachmentType = getAttachmentType(file.type);
      sendMessage.mutate({
        id: conversationId,
        data: {
          content: content.trim() || undefined,
          attachmentUrl: objectPath,
          attachmentType,
          attachmentName: file.name,
          attachmentMimeType: file.type,
          attachmentSize: file.size
        }
      }, {
        onSuccess: () => {
          setContent('');
          setPendingUpload(null);
          scrollToBottom();
          invalidateMessages();
        }
      });
    } catch (e) {
      console.error('Upload failed', e);
    } finally {
      setIsUploading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const handleSend = () => {
    if (!content.trim() && !pendingUpload) return;
    
    if (pendingUpload) {
      void uploadFile(pendingUpload);
    } else {
      sendMessage.mutate({
        id: conversationId,
        data: { content: content.trim() }
      }, {
        onSuccess: () => {
          setContent('');
          scrollToBottom();
          invalidateMessages();
        }
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-16 px-4 md:px-6 border-b border-border/50 flex items-center gap-4 bg-card/50 backdrop-blur">
        <button onClick={onBack} className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
        <div className="font-bold font-serif text-lg">Чат</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6" ref={scrollRef}>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-6 flex flex-col justify-end min-h-full">
            {messages.map((msg, i) => {
              const isMe = msg.senderClerkId === user?.id;
              const showAvatar = !isMe && (i === 0 || messages[i-1].senderClerkId !== msg.senderClerkId);
              
              return (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isMe={isMe}
                  showAvatar={showAvatar}
                  conversationId={conversationId}
                  onOptimisticDelete={handleOptimisticDelete}
                  onOptimisticEdit={handleOptimisticEdit}
                />
              );
            })}
          </div>
        )}
      </div>

      {pendingUpload && (
        <div className="px-6 py-3 bg-muted/30 border-t border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded bg-background border border-border flex items-center justify-center shrink-0">
              <Paperclip className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="truncate">
              <p className="text-sm font-medium truncate">{pendingUpload.name}</p>
              <p className="text-xs text-muted-foreground">{(pendingUpload.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          <button onClick={() => setPendingUpload(null)} className="p-2 text-muted-foreground hover:text-destructive shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="p-4 bg-card border-t border-border/50">
        <div className="flex items-end gap-2 bg-background border border-border rounded-3xl p-2 pl-4 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
          <Textarea 
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Написать сообщение..."
            className="flex-1 min-h-[40px] max-h-[120px] resize-none border-0 focus-visible:ring-0 px-0 py-2 bg-transparent"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <div className="flex items-center gap-1 pb-1">
            <label className="cursor-pointer p-2 text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-muted">
              <input 
                type="file" 
                className="hidden" 
                onChange={e => e.target.files?.[0] && setPendingUpload(e.target.files[0])}
              />
              <Paperclip className="w-5 h-5" />
            </label>
            <Button 
              onClick={handleSend} 
              disabled={(!content.trim() && !pendingUpload) || isUploading || sendMessage.isPending}
              size="icon" 
              className="rounded-full w-10 h-10"
            >
              {isUploading || sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Read-only chat thread for super-admin viewing another user's conversation */
function AdminReadonlyChatThread({
  conversationId,
  onBack,
  currentUserClerkId,
}: {
  conversationId: number;
  onBack: () => void;
  currentUserClerkId: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchAdminConversationMessages(conversationId)
      .then(data => setMessages(Array.isArray(data) ? data : []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [conversationId]);

  useEffect(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  }, [messages.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="h-16 px-4 md:px-6 border-b border-border/50 flex items-center gap-4 bg-amber-500/10 backdrop-blur">
        <button onClick={onBack} className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
        <Eye className="w-4 h-4 text-amber-600" />
        <div className="font-bold font-serif text-lg">Просмотр беседы (только чтение)</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6" ref={scrollRef}>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-6 flex flex-col justify-end min-h-full">
            {messages.map((msg: any, i: number) => {
              const isA = msg.senderClerkId === currentUserClerkId;
              const showAvatar = i === 0 || messages[i-1].senderClerkId !== msg.senderClerkId;
              
              return (
                <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isA ? 'self-end flex-row-reverse' : 'self-start'}`}>
                  {!isA && (
                    <div className="w-8 shrink-0">
                      {showAvatar && (
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={msg.senderAvatarUrl || ''} />
                          <AvatarFallback className="text-[10px]">{msg.senderName?.charAt(0) ?? '?'}</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )}
                  <div className={`flex flex-col ${isA ? 'items-end' : 'items-start'}`}>
                    {showAvatar && (
                      <span className="text-xs text-muted-foreground mb-1 ml-1 font-medium">{msg.senderName}</span>
                    )}
                    <div className={`rounded-2xl px-4 py-2.5 ${isA ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm border border-border/50 text-foreground'}`}>
                      {msg.isDeleted ? (
                        <p className="text-sm italic opacity-60">Сообщение удалено</p>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {msg.isEdited && !msg.isDeleted && (
                        <span className="text-[10px] text-muted-foreground opacity-60 italic">(изменено)</span>
                      )}
                      <span className="text-[10px] text-muted-foreground mt-1 opacity-60">
                        {parseApiDate(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4 bg-card border-t border-border/50 text-center text-sm text-amber-600 font-medium">
        <Eye className="w-4 h-4 inline mr-2" />
        Режим просмотра — отправка сообщений недоступна
      </div>
    </div>
  );
}

function AttachmentPreview({ url, type, name, size, isMe }: { url: string, type: any, name: string, size: number | null, isMe: boolean }) {
  const displaySize = size ? `${(size / 1024 / 1024).toFixed(2)} MB` : '';
  
  if (type === 'image') {
    return (
      <div className="mt-2 relative group w-64 max-w-full rounded-xl overflow-hidden border border-black/10">
        <img src={url} alt={name} className="w-full h-auto object-cover" />
        <a href={url} download target="_blank" rel="noreferrer" className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur">
          <Download className="w-4 h-4" />
        </a>
      </div>
    );
  }
  
  if (type === 'video') {
    return (
      <div className="mt-2 w-64 max-w-full rounded-xl overflow-hidden border border-black/10 bg-black">
        <video src={url} controls className="w-full h-auto" />
      </div>
    );
  }

  return (
    <a 
      href={url} 
      download 
      target="_blank" 
      rel="noreferrer"
      className={`mt-2 flex items-center gap-3 p-3 rounded-xl border ${isMe ? 'bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20' : 'bg-background border-border hover:border-primary/30 text-foreground'} transition-colors`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isMe ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
        <FileText className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate">{name}</p>
        <p className={`text-xs ${isMe ? 'opacity-80' : 'text-muted-foreground'}`}>{displaySize}</p>
      </div>
      <Download className="w-4 h-4 shrink-0 opacity-50" />
    </a>
  );
}

function NewConversationDialog({ onSelect }: { onSelect: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const startSupport = useStartSupportConversation();
  const startDirect = useStartDirectConversation();
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useListChatUsers({ q: search }, { query: { queryKey: ['users', search] } });

  const handleSupport = () => {
    startSupport.mutate(undefined, {
      onSuccess: (res) => {
        setOpen(false);
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        onSelect(res.id);
      }
    });
  };

  const handleDirect = (clerkUserId: string) => {
    startDirect.mutate({ data: { targetClerkId: clerkUserId } }, {
      onSuccess: (res) => {
        setOpen(false);
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        onSelect(res.id);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full gap-2 shadow-sm">
          <FilePlus className="w-4 h-4" /> <span className="hidden sm:inline">Новая беседа</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Начать диалог</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-6">
          <Button 
            onClick={handleSupport} 
            disabled={startSupport.isPending}
            className="w-full h-16 justify-start px-6 rounded-2xl bg-primary/10 hover:bg-primary border border-primary/20 hover:border-primary text-primary hover:text-primary-foreground group transition-all"
          >
            <Shield className="w-6 h-6 mr-4 opacity-70 group-hover:opacity-100" />
            <div className="text-left">
              <div className="font-bold text-base">Служба поддержки / Администрация</div>
              <div className="text-xs font-normal opacity-80">Задать вопрос команде сайта</div>
            </div>
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground font-bold tracking-widest">Или с участником</span></div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Поиск по имени или email..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
              {isLoading ? (
                <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : users?.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Пользователи не найдены</div>
              ) : (
                users?.map(u => (
                  <button
                    key={u.clerkUserId}
                    onClick={() => handleDirect(u.clerkUserId)}
                    disabled={startDirect.isPending}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-background hover:border-primary/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-border">
                        <AvatarImage src={u.avatarUrl || ''} />
                        <AvatarFallback><UserCircle className="w-6 h-6 text-muted-foreground" /></AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-sm text-foreground">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <MessageCircle className="w-4 h-4 text-muted-foreground opacity-50" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Super-admin user picker: search users and pick one to view their chats */
function SuperAdminUserPickerDialog({ onSelectUser }: { onSelectUser: (clerkUserId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: users, isLoading } = useListChatUsers({ q: search }, { query: { queryKey: ['admin-user-search', search] } });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10">
          <Eye className="w-4 h-4" /> <span className="hidden sm:inline">Просмотр чатов</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl flex items-center gap-2">
            <Eye className="w-5 h-5 text-amber-600" />
            Просмотр переписки пользователя
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mt-1">Доступно только super-admin (владельцу). Выберите пользователя для просмотра.</p>
        
        <div className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Поиск по имени или email..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          
          <div className="max-h-[360px] overflow-y-auto space-y-2 pr-2">
            {isLoading ? (
              <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : users?.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Пользователи не найдены</div>
            ) : (
              users?.map(u => (
                <button
                  key={u.clerkUserId}
                  onClick={() => {
                    onSelectUser(u.clerkUserId);
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-background hover:border-amber-500/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-border">
                      <AvatarImage src={u.avatarUrl || ''} />
                      <AvatarFallback><UserCircle className="w-6 h-6 text-muted-foreground" /></AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-sm text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-amber-500 opacity-60" />
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getAttachmentType(mime: string): 'image' | 'video' | 'file' {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'file';
}
