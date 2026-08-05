'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface CustomField {
  key: string
  label: string
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select'
  required?: boolean
  options?: string[]
}

interface TrainingSession {
  id: string
  title: string | null
  format: string
  start_date: string
  end_date: string
  capacity: number
  location: string | null
  visio_link: string | null
}

interface TrainingInfo {
  id: string
  title: string
  description: string | null
  price: number
  duration_hours: number | null
  custom_fields: CustomField[]
  sessions: TrainingSession[]
}

export default function InscriptionPage() {
  const params = useParams()
  const trainingId = params.trainingId as string

  const [training, setTraining] = useState<TrainingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  const [form, setForm] = useState({ student_name: '', student_email: '', student_phone: '', student_company: '', session_id: '' })
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!trainingId) return
    fetch(`/api/public/training-info?id=${trainingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setTraining(data)
      })
      .catch(() => setError("Impossible de charger la formation."))
      .finally(() => setLoading(false))
  }, [trainingId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.student_name.trim() || !form.student_email.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/public/formation-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          training_id: trainingId,
          session_id: form.session_id || null,
          student_name: form.student_name,
          student_email: form.student_email,
          student_phone: form.student_phone || null,
          student_company: form.student_company || null,
          custom_answers: Object.keys(customAnswers).length > 0 ? customAnswers : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Une erreur est survenue."); setSubmitting(false); return }
      setDone(data.registration_number)
    } catch {
      setError("Une erreur est survenue, réessayez.")
      setSubmitting(false)
    }
  }

  const fmt = (n: number) => n.toLocaleString('fr-FR') + ' GNF'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f6fa]">
        <div className="animate-pulse text-gray-400 text-lg">Chargement…</div>
      </div>
    )
  }

  if (error && !training) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f6fa] px-4">
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-md">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Lien invalide</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f6fa] px-4">
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-md">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Inscription confirmée !</h1>
          <p className="text-gray-500 mb-1">Merci pour votre inscription à <strong>{training?.title}</strong>.</p>
          <p className="text-gray-400 text-sm">Référence : {done}</p>
          <p className="text-gray-400 text-sm mt-4">Notre équipe vous contactera très prochainement.</p>
        </div>
      </div>
    )
  }

  if (!training) return null

  return (
    <div className="min-h-screen bg-[#f4f6fa] py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-700 px-8 py-10 text-center">
            <h1 className="text-2xl font-extrabold text-white mb-1">{training.title}</h1>
            {training.description && <p className="text-white/70 text-sm">{training.description}</p>}
            <p className="text-white font-bold text-lg mt-4">{fmt(training.price)}</p>
            {training.duration_hours && <p className="text-white/60 text-xs">{training.duration_hours}h de formation</p>}
          </div>

          <form onSubmit={handleSubmit} className="bg-white px-8 py-8 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
            )}

            {training.sessions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session souhaitée</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
                  value={form.session_id}
                  onChange={(e) => setForm((f) => ({ ...f, session_id: e.target.value }))}
                >
                  <option value="">Sans préférence</option>
                  {training.sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title || 'Session'} — {new Date(s.start_date).toLocaleDateString('fr-FR')} ({s.format})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
              <input required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" value={form.student_name}
                onChange={(e) => setForm((f) => ({ ...f, student_name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input required type="email" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" value={form.student_email}
                onChange={(e) => setForm((f) => ({ ...f, student_email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" value={form.student_phone}
                onChange={(e) => setForm((f) => ({ ...f, student_phone: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entreprise</label>
              <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" value={form.student_company}
                onChange={(e) => setForm((f) => ({ ...f, student_company: e.target.value }))} />
            </div>

            {training.custom_fields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}{field.required && ' *'}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    required={field.required}
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none"
                    value={customAnswers[field.key] || ''}
                    onChange={(e) => setCustomAnswers((a) => ({ ...a, [field.key]: e.target.value }))}
                  />
                ) : field.type === 'select' ? (
                  <select
                    required={field.required}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
                    value={customAnswers[field.key] || ''}
                    onChange={(e) => setCustomAnswers((a) => ({ ...a, [field.key]: e.target.value }))}
                  >
                    <option value="">Choisir…</option>
                    {(field.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    required={field.required}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
                    value={customAnswers[field.key] || ''}
                    onChange={(e) => setCustomAnswers((a) => ({ ...a, [field.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold py-3 px-6 rounded-full hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-wait mt-2"
            >
              {submitting ? 'Envoi…' : "S'inscrire"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
