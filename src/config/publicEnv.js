/* global __PUBLIC_ENV__ */

const fromBuild =
  typeof __PUBLIC_ENV__ !== 'undefined' && __PUBLIC_ENV__
    ? __PUBLIC_ENV__
    : {}

export const publicEnv = {
  supabaseUrl: fromBuild.supabaseUrl || '',
  supabasePublishableKey: fromBuild.supabasePublishableKey || '',
  geminiApiKey: fromBuild.geminiApiKey || '',
}

export const isSupabaseConfigured = Boolean(
  publicEnv.supabaseUrl && publicEnv.supabasePublishableKey
)
