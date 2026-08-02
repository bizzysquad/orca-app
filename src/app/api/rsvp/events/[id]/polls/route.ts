import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { logAudit, requireStaff } from '@/lib/rsvp/staffAuth'

export const dynamic = 'force-dynamic'

// PUT replaces the whole poll-questions (+ nested options) list for an
// event. Same replace-by-id contract as /dates.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaff(req, 'event_admin')
  if ('response' in auth) return auth.response
  const { staff } = auth

  try {
    const body = await req.json()
    const questions = Array.isArray(body?.questions) ? body.questions : []
    const supabase = getRsvpAdmin()

    const { data: existingQ } = await supabase.from('rsvp_poll_questions').select('id').eq('event_id', params.id)
    const keepQ = new Set(questions.filter((q: any) => q.id).map((q: any) => q.id))
    const deleteQ = (existingQ || []).filter((r: any) => !keepQ.has(r.id)).map((r: any) => r.id)
    if (deleteQ.length) await supabase.from('rsvp_poll_questions').delete().in('id', deleteQ)

    const result = []
    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi]
      if (!q.question || !q.kind) continue
      let questionId = q.id
      if (questionId) {
        await supabase
          .from('rsvp_poll_questions')
          .update({ kind: q.kind, question: q.question, sort_order: qi })
          .eq('id', questionId)
      } else {
        const { data } = await supabase
          .from('rsvp_poll_questions')
          .insert({ event_id: params.id, kind: q.kind, question: q.question, sort_order: qi })
          .select()
          .single()
        questionId = data?.id
      }
      if (!questionId) continue

      const options = Array.isArray(q.options) ? q.options : []
      const { data: existingOpts } = await supabase
        .from('rsvp_poll_options')
        .select('id')
        .eq('poll_question_id', questionId)
      const keepOpts = new Set(options.filter((o: any) => o.id).map((o: any) => o.id))
      const deleteOpts = (existingOpts || []).filter((r: any) => !keepOpts.has(r.id)).map((r: any) => r.id)
      if (deleteOpts.length) await supabase.from('rsvp_poll_options').delete().in('id', deleteOpts)

      const savedOptions = []
      for (let oi = 0; oi < options.length; oi++) {
        const o = options[oi]
        if (!o.label) continue
        if (o.id) {
          const { data } = await supabase
            .from('rsvp_poll_options')
            .update({ label: o.label, sort_order: oi })
            .eq('id', o.id)
            .select()
            .single()
          if (data) savedOptions.push(data)
        } else {
          const { data } = await supabase
            .from('rsvp_poll_options')
            .insert({ poll_question_id: questionId, label: o.label, sort_order: oi })
            .select()
            .single()
          if (data) savedOptions.push(data)
        }
      }

      result.push({ id: questionId, kind: q.kind, question: q.question, options: savedOptions })
    }

    await logAudit(staff, 'update_polls', 'rsvp_events', params.id, { count: result.length })
    return NextResponse.json({ questions: result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save polls' }, { status: 500 })
  }
}
