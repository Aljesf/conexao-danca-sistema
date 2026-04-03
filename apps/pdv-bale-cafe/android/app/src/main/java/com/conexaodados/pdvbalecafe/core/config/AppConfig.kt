package com.conexaodados.pdvbalecafe.core.config

import com.conexaodados.pdvbalecafe.BuildConfig

object AppConfig {
  const val API_BASE_URL: String = BuildConfig.API_BASE_URL
  const val SUPABASE_URL: String = BuildConfig.SUPABASE_URL
  const val SUPABASE_ANON_KEY: String = BuildConfig.SUPABASE_ANON_KEY

  val environment: String
    get() = if (BuildConfig.DEBUG) "debug" else "release"

  val hasSupabaseConfig: Boolean
    get() = SUPABASE_URL.isNotBlank() && SUPABASE_ANON_KEY.isNotBlank()
}
