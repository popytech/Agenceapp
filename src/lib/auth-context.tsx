'use client'

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, Profile } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string, role?: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function fetchProfileFromDB(userId: string, userEmail?: string): Promise<Profile | null> {
  try {
    const cleanEmail = userEmail?.trim().toLowerCase()
    
    // 1. First try by ID (most reliable)
    const { data: byId, error: idError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (!idError && byId) {
      return byId as Profile
    }

    // 2. If not found by ID, search by email (might have been pre-created by admin)
    if (cleanEmail) {
      const { data: byEmail, error: emailError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle()

      if (!emailError && byEmail) {
        console.log("Linking existing profile by email:", cleanEmail, "to new ID:", userId)
        // Link the profile to the new Auth ID
        const { data: updated, error: updateError } = await supabase
          .from('profiles')
          .update({ id: userId, updated_at: new Date().toISOString() })
          .eq('email', cleanEmail)
          .select()
          .single()

        if (!updateError && updated) {
          return updated as Profile
        }
      }
    }

    // 3. Profile not found at all — create it
    const newProfile: Partial<Profile> = {
      id: userId,
      email: cleanEmail || '',
      full_name: cleanEmail?.split('@')[0] || 'Utilisateur',
      role: 'client',
    }

    const { data: created, error: createError } = await supabase
      .from('profiles')
      .upsert(newProfile)
      .select()
      .maybeSingle()

    if (createError) {
      console.error("Profile creation failed:", createError.message)
    }

    return (created as Profile) || (newProfile as Profile)
  } catch (err) {
    console.error("Critical Profile Error:", err)
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const lastFetchedIdRef = useRef<string | null>(null)

    // Only update profile state when id or role actually changes — prevents infinite render loops
      function setProfileStable(p: Profile | null) {
        if (!p) {
          lastFetchedIdRef.current = null
          setProfile(null)
          return
        }
        
        // If profile data is same as current, skip
        if (profile && p.id === profile.id && p.role === profile.role) {
          return
        }
        
        lastFetchedIdRef.current = p.id
        setProfile(p)
      }

    async function refreshProfile() {
      if (!user) return
      const p = await fetchProfileFromDB(user.id, user.email || undefined)
      if (p) setProfileStable(p)
    }

    useEffect(() => {
      let mounted = true
      let authSubscription: any = null

      async function syncProfile(u: User) {
        if (lastFetchedIdRef.current === u.id && profile) return
        const p = await fetchProfileFromDB(u.id, u.email || undefined)
        if (mounted) setProfileStable(p)
      }

      async function initializeAuth() {
        try {
          // Get initial session
          const { data: { session } } = await supabase.auth.getSession()
          if (!mounted) return

          if (session?.user) {
            setUser(session.user)
            await syncProfile(session.user)
          }
        } catch (err) {
          console.error("Auth init error:", err)
        } finally {
          if (mounted) setLoading(false)
        }

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return
          
          if (session?.user) {
            setUser(session.user)
            if (event === 'SIGNED_IN') {
              // Only set loading if we don't have a profile yet for this user
              if (lastFetchedIdRef.current !== session.user.id) {
                setLoading(true)
                await syncProfile(session.user)
                if (mounted) setLoading(false)
              }
            }
          } else if (event === 'SIGNED_OUT') {
            lastFetchedIdRef.current = null
            setUser(null)
            setProfile(null)
            if (mounted) setLoading(false)
          }
        })
        authSubscription = subscription
      }

    initializeAuth()

    return () => {
      mounted = false
      if (authSubscription) authSubscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    const cleanEmail = email.trim().toLowerCase()
    const { error, data } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
    if (error) return { error: error.message }
    if (data.user) {
      const p = await fetchProfileFromDB(data.user.id, cleanEmail)
      setProfileStable(p)
    }
    return { error: null }
  }

  async function signUp(email: string, password: string, fullName: string, role = 'client') {
    const cleanEmail = email.trim().toLowerCase()
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password, fullName, role }),
    })
    const json = await res.json()
    if (!res.ok) return { error: json.error || 'Erreur inscription' }
    await supabase.auth.signInWithPassword({ email: cleanEmail, password })
    return { error: null }
  }

  async function signOut() {
    lastFetchedIdRef.current = null
    setUser(null)
    setProfile(null)
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
