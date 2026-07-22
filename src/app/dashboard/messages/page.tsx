'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'

function getErrorMessage(error: any, fallback: string) {
  return error?.message ? `${fallback} : ${error.message}` : fallback
}
import { Send, Search, ArrowLeft, MessageSquare, Plus, Check, CheckCheck, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  super_admin: 'bg-red-100 text-red-700',
  chef_projet: 'bg-orange-100 text-orange-700',
  designer: 'bg-purple-100 text-purple-700',
  developpeur: 'bg-blue-100 text-blue-700',
  marketeur: 'bg-green-100 text-green-700',
  cm: 'bg-teal-100 text-teal-700',
  'vidéaste': 'bg-pink-100 text-pink-700',
  monteur_video: 'bg-pink-100 text-pink-700',
  formateur: 'bg-amber-100 text-amber-700',
  stagiaire: 'bg-muted text-muted-foreground',
}

const initials = (name: string) =>
  (name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

const formatDate = (iso: string) => {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

// Sentinel value for the group chat
const GROUP_CHAT_ID = '__group__'

export default function MessagesPage() {
  const { user } = useAuth()

  // ── State ────────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [isGroupChat, setIsGroupChat] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [groupMessages, setGroupMessages] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({})
  const [unreadGroup, setUnreadGroup] = useState(0)

  const selectedUserRef = useRef<any>(null)
  const isGroupChatRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Notification sound ───────────────────────────────────────────────────
  const playSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
      osc.onended = () => ctx.close()
    } catch {}
  }, [])

  const resetTextareaHeight = () => {
    if (textareaRef.current) textareaRef.current.style.height = '44px'
  }

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior }), 50)
  }

  // ── Data fetchers ────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, avatar_url')
      .neq('id', user.id)
      .order('full_name')
    setAllUsers(data || [])
  }, [user])

  const fetchConversations = useCallback(async () => {
    if (!user) return
    // Charge seulement les 200 messages les plus récents pour construire les conversations
    const { data } = await supabase
      .from('messages')
      .select('id,sender_id,receiver_id,content,is_read,created_at,sender:profiles!messages_sender_id_fkey(id,full_name,email,role),receiver:profiles!messages_receiver_id_fkey(id,full_name,email,role)')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(200)

    const convMap = new Map()
    const unread: Record<string, number> = {}

    for (const msg of data || []) {
      const partner = msg.sender_id === user.id ? (msg.receiver as any) : (msg.sender as any)
      if (!partner || !partner.id) continue
      if (!convMap.has(partner.id)) {
        convMap.set(partner.id, { partner, lastMessage: msg })
      }
      if (msg.receiver_id === user.id && !msg.is_read) {
        unread[partner.id] = (unread[partner.id] || 0) + 1
      }
    }

    setConversations(Array.from(convMap.values()))
    setUnreadMap(unread)
    setLoading(false)
  }, [user])

  const fetchMessages = useCallback(async (partnerId: string) => {
    if (!user) return
    const { data, error } = await supabase
      .from('messages')
      .select('id,sender_id,receiver_id,content,is_read,created_at,sender:profiles!messages_sender_id_fkey(id,full_name)')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(r => ({ ...r, data: (r.data || []).reverse() }))

    if (error) { console.error(error); return }
    setMessages(data || [])

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', user.id)
      .eq('sender_id', partnerId)
      .eq('is_read', false)

    setUnreadMap(prev => { const n = { ...prev }; delete n[partnerId]; return n })
    scrollToBottom('instant')
  }, [user])

  const fetchGroupMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('group_messages')
      .select('*, sender:profiles!group_messages_sender_id_fkey(id, full_name, role)')
      .order('created_at', { ascending: true })
    if (error) { console.error(error); return }
    setGroupMessages(data || [])
    scrollToBottom('instant')
  }, [])

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    fetchUsers()
    fetchConversations()
  }, [user, fetchUsers, fetchConversations])

  // ── Realtime — private messages ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`messages-rt-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: any) => {
          const msg = payload.new
          const currentPartner = selectedUserRef.current

          // Play sound for incoming messages (not sent by self)
          if (msg.sender_id !== user.id) {
            playSound()
          }

          if (
            currentPartner &&
            !isGroupChatRef.current &&
            (
              (msg.sender_id === user.id && msg.receiver_id === currentPartner.id) ||
              (msg.sender_id === currentPartner.id && msg.receiver_id === user.id)
            )
          ) {
            setMessages(prev => {
              if (prev.some((m: any) => m.id === msg.id)) return prev
              return [...prev, msg]
            })
            scrollToBottom()

            if (msg.receiver_id === user.id) {
              supabase.from('messages').update({ is_read: true }).eq('id', msg.id).then(() => {})
            }
          }

          fetchConversations()
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, fetchConversations, playSound])

  // ── Realtime — group messages ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('group-messages-rt')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages' },
        async (payload: any) => {
          const msg = payload.new

            // Play sound for incoming group messages (not sent by self)
            if (msg.sender_id !== user.id) {
              playSound()
              // Increment unread group badge if not currently viewing group
              if (!isGroupChatRef.current) {
                setUnreadGroup(prev => prev + 1)
              }
            }

          // Fetch sender profile
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('id', msg.sender_id)
            .single()

          const fullMsg = { ...msg, sender }

          if (isGroupChatRef.current) {
            setGroupMessages(prev => {
              if (prev.some((m: any) => m.id === msg.id)) return prev
              return [...prev, fullMsg]
            })
            scrollToBottom()
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, playSound])

  // ── Load messages when selection changes ──────────────────────────────────
  useEffect(() => {
    selectedUserRef.current = selectedUser
    isGroupChatRef.current = isGroupChat

    if (isGroupChat) {
      fetchGroupMessages()
    } else if (selectedUser) {
      fetchMessages(selectedUser.id)
    }

    setTimeout(() => textareaRef.current?.focus(), 100)
  }, [selectedUser, isGroupChat, fetchMessages, fetchGroupMessages])

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = newMessage.trim()
    if (!text || (!selectedUser && !isGroupChat) || !user || sending) return

    setSending(true)
    setNewMessage('')
    resetTextareaHeight()

    if (isGroupChat) {
      const { data, error } = await supabase
        .from('group_messages')
        .insert({ sender_id: user.id, content: text })
        .select('*, sender:profiles!group_messages_sender_id_fkey(id, full_name, role)')
        .single()

      if (error) {
        toast.error("Erreur lors de l'envoi")
        setNewMessage(text)
      } else if (data) {
        setGroupMessages(prev => {
          if (prev.some((m: any) => m.id === data.id)) return prev
          return [...prev, data]
        })
        scrollToBottom()
      }
    } else {
      const { data, error } = await supabase
        .from('messages')
        .insert({ sender_id: user.id, receiver_id: selectedUser.id, content: text })
        .select('*, sender:profiles!messages_sender_id_fkey(id, full_name)')
        .single()

      if (error) {
        toast.error("Erreur lors de l'envoi")
        setNewMessage(text)
      } else if (data) {
        setMessages(prev => {
          if (prev.some((m: any) => m.id === data.id)) return prev
          return [...prev, data]
        })
        scrollToBottom()
        fetchConversations()
      }
    }

    setSending(false)
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── Open conversations ────────────────────────────────────────────────────
  function openGroupChat() {
    setIsGroupChat(true)
    setSelectedUser(null)
    setShowChat(true)
    setUnreadGroup(0)
  }

  function openConversation(u: any) {
    setIsGroupChat(false)
    setSelectedUser(u)
    setShowChat(true)
  }

  function goBack() {
    setShowChat(false)
    setSelectedUser(null)
    setIsGroupChat(false)
  }

  // ── Filtered users ────────────────────────────────────────────────────────
  const filteredUsers = allUsers.filter(u =>
    search === '' ||
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0) + unreadGroup

  // Decide which messages to show
  const activeMessages = isGroupChat ? groupMessages : messages

  // ─────────────────────────────────────────────────────────────────────────
  // CONTACTS PANEL
  // ─────────────────────────────────────────────────────────────────────────
  const ContactsPanel = (
    <div className={cn(
      'flex flex-col bg-background border-r border-border h-full',
      'w-full md:w-80 lg:w-72 xl:w-80 shrink-0',
      showChat ? 'hidden md:flex' : 'flex'
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Messages</h1>
            {totalUnread > 0 && (
              <Badge className="h-5 min-w-5 px-1 flex items-center justify-center text-[10px] rounded-full">
                {totalUnread}
              </Badge>
            )}
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setSearch('')}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher un membre..."
            className="w-full pl-9 pr-3 h-9 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Chat Général ── */}
        <div className="pt-2 pb-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-1">
            Général
          </p>
          <button
            onClick={openGroupChat}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 transition-colors text-left',
              isGroupChat ? 'bg-primary/10' : 'hover:bg-muted/60 active:bg-muted'
            )}
          >
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-primary-foreground" />
            </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-semibold truncate', isGroupChat && 'text-primary')}>
                  Chat Général
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Toute l'équipe · {allUsers.length + 1} membres
                </p>
              </div>
              {unreadGroup > 0 && (
                <span className="shrink-0 h-5 min-w-5 px-1 bg-primary rounded-full flex items-center justify-center text-[10px] text-primary-foreground font-bold">
                  {unreadGroup}
                </span>
              )}
          </button>
        </div>

        {/* ── Recent conversations ── */}
        {conversations.length > 0 && (
          <div className="pt-1">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-1">
              Récents
            </p>
            {conversations.map(({ partner, lastMessage }) => {
              const unread = unreadMap[partner.id] || 0
              const isSelected = !isGroupChat && selectedUser?.id === partner.id
              return (
                <button
                  key={partner.id}
                  onClick={() => openConversation(partner)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 transition-colors text-left',
                    isSelected ? 'bg-primary/10' : 'hover:bg-muted/60 active:bg-muted'
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className={cn(
                        'text-sm font-semibold',
                        isSelected ? 'bg-primary/20 text-primary' : 'bg-muted-foreground/10'
                      )}>
                        {initials(partner.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={cn('text-sm truncate', unread > 0 ? 'font-bold' : 'font-medium')}>
                        {partner.full_name || partner.email}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatTime(lastMessage.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <p className={cn('text-xs truncate', unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                        {lastMessage.sender_id === user?.id ? 'Vous : ' : ''}{lastMessage.content}
                      </p>
                      {unread > 0 ? (
                        <span className="shrink-0 h-5 min-w-5 px-1 bg-primary rounded-full flex items-center justify-center text-[10px] text-primary-foreground font-bold">
                          {unread}
                        </span>
                      ) : lastMessage.sender_id === user?.id ? (
                        <CheckCheck className="h-3 w-3 text-muted-foreground shrink-0" />
                      ) : null}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* ── All members ── */}
        <div className="pt-1 pb-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-1">
            {search ? 'Résultats' : 'Tous les membres'}
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucun membre trouvé</p>
          ) : filteredUsers.map(u => {
            const isSelected = !isGroupChat && selectedUser?.id === u.id
            const inConv = conversations.some(c => c.partner.id === u.id)
            if (inConv && !search) return null
            return (
              <button
                key={u.id}
                onClick={() => openConversation(u)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 transition-colors text-left',
                  isSelected ? 'bg-primary/10' : 'hover:bg-muted/60 active:bg-muted'
                )}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className={cn(
                    'text-sm font-semibold',
                    isSelected ? 'bg-primary/20 text-primary' : 'bg-muted-foreground/10'
                  )}>
                    {initials(u.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.full_name || u.email}</p>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                    ROLE_COLORS[u.role] || 'bg-muted text-muted-foreground'
                  )}>
                    {(u.role || '').replace(/_/g, ' ')}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // CHAT PANEL
  // ─────────────────────────────────────────────────────────────────────────
  const chatTitle = isGroupChat ? 'Chat Général' : (selectedUser?.full_name || selectedUser?.email || '')
  const chatSubtitle = isGroupChat ? `${allUsers.length + 1} membres` : 'En ligne'
  const chatInitials = isGroupChat ? null : initials(selectedUser?.full_name || '')
  const chatRole = isGroupChat ? null : selectedUser?.role
  const inputPlaceholder = isGroupChat
    ? 'Message à toute l\'équipe...'
    : `Message à ${selectedUser?.full_name?.split(' ')[0] || 'ce membre'}...`

  const ChatPanel = (
    <div className={cn(
      'flex-1 flex flex-col min-w-0 h-full',
      showChat ? 'flex' : 'hidden md:flex'
    )}>
      {!selectedUser && !isGroupChat ? (
        /* Empty state */
        <div className="flex-1 flex items-center justify-center bg-muted/10">
          <div className="text-center p-8">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-9 w-9 text-muted-foreground/40" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Vos messages</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Rejoignez le Chat Général ou sélectionnez un membre
            </p>
            <Button className="mt-4 gap-2" onClick={openGroupChat}>
              <Users className="h-4 w-4" />
              Chat Général
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Chat header ─────────────────────────────────── */}
          <div className="px-4 py-3 border-b border-border bg-background flex items-center gap-3 shrink-0">
            <button
              className="md:hidden p-1.5 -ml-1 rounded-lg hover:bg-muted transition-colors"
              onClick={goBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="relative shrink-0">
              {isGroupChat ? (
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary-foreground" />
                </div>
              ) : (
                <>
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {chatInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                </>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{chatTitle}</p>
              <p className={cn('text-xs font-medium', isGroupChat ? 'text-muted-foreground' : 'text-emerald-500')}>
                {chatSubtitle}
              </p>
            </div>
            {chatRole && (
              <span className={cn(
                'hidden sm:inline-flex text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0',
                ROLE_COLORS[chatRole] || 'bg-muted text-muted-foreground'
              )}>
                {(chatRole || '').replace(/_/g, ' ')}
              </span>
            )}
          </div>

          {/* ── Messages list ───────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1 bg-muted/10">
            {activeMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <div className="text-center">
                  {isGroupChat ? (
                    <>
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <Users className="h-8 w-8 text-primary" />
                      </div>
                      <p className="font-semibold">Chat Général</p>
                      <p className="text-muted-foreground text-sm mt-1">Soyez le premier à écrire à toute l'équipe 👋</p>
                    </>
                  ) : (
                    <>
                      <Avatar className="h-16 w-16 mx-auto mb-3">
                        <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                          {chatInitials}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-semibold">{chatTitle}</p>
                      <p className="text-muted-foreground text-sm mt-1">Démarrez la conversation 👋</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>
                {activeMessages.map((msg: any, i: number) => {
                  const isMine = msg.sender_id === user?.id
                  const prevMsg = activeMessages[i - 1]
                  const nextMsg = activeMessages[i + 1]
                  const showDate = !prevMsg ||
                    new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()
                  const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id
                  const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id

                  const senderName = isGroupChat
                    ? (msg.sender?.full_name || 'Inconnu')
                    : (msg.sender?.full_name || '')

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex items-center justify-center my-4">
                          <span className="text-[11px] text-muted-foreground bg-background border border-border px-3 py-1 rounded-full">
                            {formatDate(msg.created_at)}
                          </span>
                        </div>
                      )}
                      <div className={cn(
                        'flex items-end gap-1.5',
                        isMine ? 'justify-end' : 'justify-start',
                        isFirstInGroup ? 'mt-3' : 'mt-0.5'
                      )}>
                        {/* Avatar for incoming messages */}
                        {!isMine && (
                          <div className="shrink-0 mb-0.5" style={{ width: 28 }}>
                            {isLastInGroup && (
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-[10px] bg-muted-foreground/10">
                                  {initials(senderName)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        )}

                        {/* Bubble */}
                        <div className={cn(
                          'max-w-[80%] sm:max-w-[65%] px-3 py-2 text-sm leading-relaxed break-words',
                          isMine
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background border border-border shadow-sm',
                          isMine
                            ? isFirstInGroup && isLastInGroup ? 'rounded-2xl rounded-br-sm'
                              : isFirstInGroup ? 'rounded-2xl rounded-br-sm'
                              : isLastInGroup ? 'rounded-2xl rounded-tr-sm rounded-br-sm'
                              : 'rounded-2xl rounded-r-sm'
                            : isFirstInGroup && isLastInGroup ? 'rounded-2xl rounded-bl-sm'
                              : isFirstInGroup ? 'rounded-2xl rounded-bl-sm'
                              : isLastInGroup ? 'rounded-2xl rounded-tl-sm rounded-bl-sm'
                              : 'rounded-2xl rounded-l-sm'
                        )}>
                          {/* Show sender name in group chat for others' messages */}
                          {isGroupChat && !isMine && isFirstInGroup && (
                            <p className={cn(
                              'text-[11px] font-semibold mb-1',
                              ROLE_COLORS[msg.sender?.role]?.split(' ')[1] || 'text-primary'
                            )}>
                              {senderName}
                            </p>
                          )}
                          <p>{msg.content}</p>
                          {isLastInGroup && (
                            <div className={cn(
                              'flex items-center justify-end gap-1 mt-0.5',
                              isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'
                            )}>
                              <span className="text-[10px]">{formatTime(msg.created_at)}</span>
                              {!isGroupChat && isMine && (
                                msg.is_read
                                  ? <CheckCheck className="h-3 w-3" />
                                  : <Check className="h-3 w-3" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* ── Input bar ───────────────────────────────────── */}
          <div className="p-3 border-t border-border bg-background shrink-0">
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  placeholder={inputPlaceholder}
                  value={newMessage}
                  onChange={e => {
                    setNewMessage(e.target.value)
                    const el = e.target
                    el.style.height = '44px'
                    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                  rows={1}
                  className={cn(
                    'w-full resize-none rounded-2xl bg-muted border-0 px-4 py-2.5 text-sm',
                    'focus:outline-none focus:ring-1 focus:ring-ring',
                    'placeholder:text-muted-foreground leading-relaxed',
                    'min-h-[44px] max-h-[120px] overflow-y-auto',
                    sending && 'opacity-60'
                  )}
                />
              </div>
              <Button
                onClick={sendMessage}
                size="icon"
                className="h-11 w-11 rounded-2xl shrink-0"
                disabled={!newMessage.trim() || sending}
              >
                {sending
                  ? <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  : <Send className="h-4 w-4" />
                }
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
              Entrée pour envoyer · Shift+Entrée pour nouvelle ligne
            </p>
          </div>
        </>
      )}
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100dvh-56px)] md:h-screen flex overflow-hidden bg-background">
      {ContactsPanel}
      {ChatPanel}
    </div>
  )
}
