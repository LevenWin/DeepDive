import { ref } from 'vue'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

const user = ref(null)
const session = ref(null)
const loading = ref(true)

const ready = supabase.auth.getSession().then(({ data }) => {
  session.value = data.session
  user.value = data.session?.user || null
  loading.value = false
})

supabase.auth.onAuthStateChange((event, newSession) => {
  session.value = newSession
  user.value = newSession?.user || null
  loading.value = false
})

export function useAuth() {
  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  async function signInWithApple() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
    user.value = null
    session.value = null
  }

  function getToken() {
    return session.value?.access_token || null
  }

  return {
    user,
    session,
    loading,
    ready,
    signInWithGoogle,
    signInWithApple,
    signOut,
    getToken,
  }
}
