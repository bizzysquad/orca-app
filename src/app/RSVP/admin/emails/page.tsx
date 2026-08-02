'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, Send, Mail } from 'lucide-react'
import AdminShell from '../_components/AdminShell'

const SEGMENTS = [
  { value: 'voters', label: 'Everyone Who Voted' },
  { value: 'date_voters', label: 'Voted For A Specific Date' },
  { value: 'attendees', label: 'Confirmed Attendees' },
  { value: 'paid_ticket_holders', label: 'Paid Ticket Holders' },
  { value: 'waitlist', label: 'Waitlisted Guests' },
  { value: 'checked_in', label: 'Checked-In Attendees' },
  { value: 'no_shows', label: 'No-Shows' },
  { value: 'cancelled', label: 'Cancelled Ticket Holders' },
  { value: 'custom', label: 'Custom Email List' },
]

const inputCls = 'w-full px-3 py-2.5 rounded-lg bg-brand-soft border border-surface-border text-text-primary text-sm placeholder:text-text-muted outline-none focus:shadow-input-focus focus:border-gold/50 transition'

export default function EmailsAdminPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [selectedKey, setSelectedKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [campaignEvent, setCampaignEvent] = useState('')
  const [campaignSegment, setCampaignSegment] = useState('voters')
  const [campaignTemplate, setCampaignTemplate] = useState('')
  const [customEmails, setCustomEmails] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/rsvp/emails/templates').then(r => r.json()),
      fetch('/api/rsvp/events').then(r => r.json()),
    ]).then(([t, e]) => {
      setTemplates(t.templates || [])
      setEvents(e.events || [])
      if (t.templates?.[0]) { setSelectedKey(t.templates[0].key); setCampaignTemplate(t.templates[0].key) }
      if (e.events?.[0]) setCampaignEvent(e.events[0].id)
    }).finally(() => setLoading(false))
  }, [])

  const selected = templates.find(t => t.key === selectedKey)

  const setField = (field: string, value: string) =>
    setTemplates(ts => ts.map(t => (t.key === selectedKey ? { ...t, [field]: value } : t)))

  const save = async () => {
    if (!selected) return
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/rsvp/emails/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selected),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setMessage('Saved')
      setTimeout(() => setMessage(''), 2000)
    } catch (e: any) {
      setMessage(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const sendCampaign = async () => {
    setSending(true)
    setSendResult('')
    try {
      const res = await fetch('/api/rsvp/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: campaignEvent,
          template_key: campaignTemplate,
          segment: campaignSegment,
          custom_emails: campaignSegment === 'custom' ? customEmails.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSendResult(`Sent to ${data.sent} of ${data.recipientCount} recipients.`)
    } catch (e: any) {
      setSendResult(e.message || 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <AdminShell><div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold" size={26} /></div></AdminShell>
  }

  return (
    <AdminShell>
      <h1 className="text-2xl font-extrabold text-text-primary mb-6">Emails</h1>

      {/* Campaign sender */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-5 sm:p-6 mb-8">
        <h2 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2"><Send size={15} className="text-gold" /> Send Campaign</h2>
        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <select className={inputCls} value={campaignEvent} onChange={e => setCampaignEvent(e.target.value)}>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
          <select className={inputCls} value={campaignSegment} onChange={e => setCampaignSegment(e.target.value)}>
            {SEGMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className={inputCls} value={campaignTemplate} onChange={e => setCampaignTemplate(e.target.value)}>
            {templates.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        {campaignSegment === 'custom' && (
          <textarea
            className={inputCls + ' mb-3'}
            rows={2}
            placeholder="comma-separated emails"
            value={customEmails}
            onChange={e => setCustomEmails(e.target.value)}
          />
        )}
        {sendResult && <p className="text-xs text-gold font-semibold mb-3">{sendResult}</p>}
        <button
          onClick={sendCampaign}
          disabled={sending || !campaignEvent}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gold-gradient text-brand-black font-bold text-xs disabled:opacity-60"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} Send Now
        </button>
      </div>

      {/* Template editor */}
      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        <div className="space-y-1">
          {templates.map(t => (
            <button
              key={t.key}
              onClick={() => setSelectedKey(t.key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition ${
                selectedKey === t.key ? 'bg-gold/15 text-gold' : 'text-text-secondary hover:bg-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {selected && (
          <div className="bg-surface-card border border-surface-border rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-text-primary">{selected.label}</h3>
              <div className="flex items-center gap-2">
                {message && <span className="text-2xs text-gold font-semibold">{message}</span>}
                <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-gradient text-brand-black text-2xs font-bold disabled:opacity-60">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-2xs font-semibold text-text-secondary mb-1">Subject</label>
                <input className={inputCls} value={selected.subject} onChange={e => setField('subject', e.target.value)} />
              </div>
              <div>
                <label className="block text-2xs font-semibold text-text-secondary mb-1">Preview Text</label>
                <input className={inputCls} value={selected.preview_text} onChange={e => setField('preview_text', e.target.value)} />
              </div>
              <div>
                <label className="block text-2xs font-semibold text-text-secondary mb-1">Heading</label>
                <input className={inputCls} value={selected.heading} onChange={e => setField('heading', e.target.value)} />
              </div>
              <div>
                <label className="block text-2xs font-semibold text-text-secondary mb-1">Body</label>
                <textarea rows={4} className={inputCls} value={selected.body_html} onChange={e => setField('body_html', e.target.value)} />
                <p className="text-2xs text-text-muted mt-1">Use {'{{event_name}}'}, {'{{event_url}}'}, {'{{ticket_url}}'}, {'{{manage_url}}'}, {'{{guest_name}}'}, {'{{from_name}}'}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-text-secondary mb-1">Button Text</label>
                  <input className={inputCls} value={selected.button_text} onChange={e => setField('button_text', e.target.value)} />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-text-secondary mb-1">Button URL Pattern</label>
                  <input className={inputCls} value={selected.button_url_pattern} onChange={e => setField('button_url_pattern', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-2xs font-semibold text-text-secondary mb-1">Footer</label>
                <input className={inputCls} value={selected.footer} onChange={e => setField('footer', e.target.value)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
