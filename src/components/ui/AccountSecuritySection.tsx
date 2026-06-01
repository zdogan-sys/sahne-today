'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { KeyRound, Mail, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function AccountSecuritySection({ currentEmail }: { currentEmail?: string | null }) {
  const isEn = useLocale() === 'en'
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState(currentEmail ?? '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSave() {
    setError('')
    setSuccess('')

    const emailChanged = email.trim() && email.trim() !== currentEmail
    const passwordChanged = password.length > 0

    if (!emailChanged && !passwordChanged) {
      setError(isEn ? 'Nothing to change.' : 'Değiştirilecek bir şey yok.')
      return
    }

    if (passwordChanged) {
      if (password.length < 6) {
        setError(isEn ? 'Password must be at least 6 characters.' : 'Şifre en az 6 karakter olmalı.')
        return
      }
      if (password !== confirmPassword) {
        setError(isEn ? 'Passwords do not match.' : 'Şifreler eşleşmiyor.')
        return
      }
    }

    setLoading(true)
    const supabase = createClient()

    if (emailChanged) {
      const { error: err } = await supabase.auth.updateUser({ email: email.trim() })
      if (err) {
        setError((isEn ? 'Could not update email: ' : 'E-posta güncellenemedi: ') + err.message)
        setLoading(false)
        return
      }
    }

    if (passwordChanged) {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) {
        setError((isEn ? 'Could not update password: ' : 'Şifre güncellenemedi: ') + err.message)
        setLoading(false)
        return
      }
    }

    setLoading(false)
    setPassword('')
    setConfirmPassword('')

    const messages: string[] = []
    if (emailChanged) messages.push(isEn ? 'A verification email has been sent to your new address.' : 'Yeni e-postanıza doğrulama maili gönderildi.')
    if (passwordChanged) messages.push(isEn ? 'Your password has been updated.' : 'Şifreniz güncellendi.')
    setSuccess(messages.join(' '))
  }

  return (
    <div className="border-t border-[rgba(228,224,216,0.1)] pt-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <KeyRound size={14} />
          <span>{isEn ? 'Email & Password' : 'E-posta & Şifre'}</span>
        </div>
        {open ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="label flex items-center gap-1.5">
              <Mail size={12} /> {isEn ? 'New Email' : 'Yeni E-posta'}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field text-sm"
              placeholder={currentEmail ?? (isEn ? 'Email address' : 'E-posta adresi')}
            />
            <p className="text-[10px] text-text-muted mt-1">{isEn ? 'If you change it, a verification email will be sent to the new address.' : 'Değiştirirseniz yeni adrese doğrulama maili gönderilir.'}</p>
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <KeyRound size={12} /> {isEn ? 'New Password' : 'Yeni Şifre'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field text-sm pr-10"
                placeholder={isEn ? 'At least 6 characters' : 'En az 6 karakter'}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {password.length > 0 && (
            <div>
              <label className="label">{isEn ? 'Confirm Password' : 'Şifre Tekrar'}</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field text-sm"
                placeholder={isEn ? 'Re-enter password' : 'Şifreyi tekrar girin'}
                autoComplete="new-password"
              />
            </div>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}
          {success && <p className="text-green-400 text-xs">{success}</p>}

          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="btn-outline w-full py-2.5 text-sm disabled:opacity-50"
          >
            {loading ? (isEn ? 'Updating...' : 'Güncelleniyor...') : (isEn ? 'Update Security Info' : 'Güvenlik Bilgilerini Güncelle')}
          </button>
        </div>
      )}
    </div>
  )
}
