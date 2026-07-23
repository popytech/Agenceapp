'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { safeChannel } from '@/lib/realtime'
import { useAuth } from '@/lib/auth-context'
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover'
import { Bell, CheckCheck, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const ICONS: Record<string, any> = {
  warning: AlertTriangle,
  error: XCircle,
  success: CheckCircle,
  info: Info,
}
const COLORS: Record<string, string> = {
  warning: 'text-amber-500',
  error: 'text-red-500',
  success: 'text-green-500',
  info: 'text-blue-500',
}

export default function NotificationsBell() {
  const { profile } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const loadedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!profile?.id) return
    if (loadedRef.current === profile.id) return
    loadedRef.current = profile.id
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setNotifications(data || []))
  }, [profile?.id])

  // Realtime subscription
  useEffect(() => {
    if (!profile?.id) return
    const channel = safeChannel(`notifications-bell-${profile.id}`, (ch) => {
      ch.on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        }, (payload) => {
          setNotifications(prev => [payload.new, ...prev])
        })
        .subscribe()
    })

    return () => {
      try {
        supabase.removeChannel(channel)
      } catch {}
    }
  }, [profile?.id])

  async function markAllRead() {
    if (!profile?.id) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const unread = notifications.filter(n => !n.is_read).length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-1 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <p className="font-semibold text-sm">Notifications</p>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
              <CheckCheck className="h-3.5 w-3.5" />Tout lire
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Aucune notification
            </div>
          ) : (
            notifications.map(n => {
              const Icon = ICONS[n.type] || Info
              return (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={cn(
                    'w-full text-left p-3 flex gap-3 hover:bg-muted/50 transition-colors border-b last:border-0',
                    !n.is_read && 'bg-primary/5'
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', COLORS[n.type])} />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-medium', !n.is_read && 'text-foreground', n.is_read && 'text-muted-foreground')}>
                      {n.title}
                    </p>
                      {n.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />}
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
