import { NextRequest, NextResponse } from 'next/server'

const PAYPAL_LINK = 'https://www.paypal.com/ncp/payment/SZLRNV23PWKNN'
const PAYPAL_RATE = 0.0349
const PAYPAL_FIXED = 0.49

function formatTime12h(t: string): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  if (isNaN(h)) return t
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

function calcPayPalFee(amount: number): { fee: number; total: number } {
  const fee = Math.round((amount * PAYPAL_RATE + PAYPAL_FIXED) * 100) / 100
  return { fee, total: Math.round((amount + fee) * 100) / 100 }
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export async function POST(req: NextRequest) {
  try {
    const { booking, type = 'inquiry', quoteAmount, depositAmount } = await req.json()
    if (!booking) return NextResponse.json({ error: 'No booking provided' }, { status: 400 })

    const dateFormatted = booking.date
      ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        })
      : 'TBD'

    const timeRange = booking.start_time && booking.end_time
      ? `${formatTime12h(booking.start_time)} - ${formatTime12h(booking.end_time)}`
      : booking.start_time ? formatTime12h(booking.start_time) : 'TBD'

    let replyText = ''
    let subject = ''

    if (type === 'decline') {
      subject = `Re: DJ Services - ${booking.event_type} on ${dateFormatted}`
      replyText = [
        `Hi ${booking.client_name},`,
        '',
        `Thank you so much for reaching out about your ${booking.event_type} on ${dateFormatted}. I really appreciate you considering me for your event.`,
        '',
        `Unfortunately, I am not available on that date. I am sorry I will not be able to be there - it sounds like it is going to be an amazing time.`,
        '',
        `Please do not hesitate to reach out for any future events. I would love the opportunity to work with you down the road.`,
        '',
        'Wishing you the best,',
        'Mask Off Da DJ',
        'maskoffdadj@gmail.com',
      ].join('\n')
    } else if (type === 'invoice') {
      const amount = Number(quoteAmount) || 0
      const deposit = Number(depositAmount) || Math.round(amount * 0.25)
      const balance = amount - deposit
      const depositPayPal = calcPayPalFee(deposit)
      const balancePayPal = calcPayPalFee(balance)
      const depositDue = new Date()
      depositDue.setDate(depositDue.getDate() + 7)
      const depositDueStr = depositDue.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

      subject = `DJ Services Quote - ${booking.event_type} on ${dateFormatted}`
      replyText = [
        `Hi ${booking.client_name},`,
        '',
        `Thank you for your booking request! I am excited about your upcoming ${booking.event_type} and would love to be a part of it.`,
        '',
        'Here are the details and pricing for your event:',
        '',
        '---------------------------------------',
        '  BOOKING DETAILS',
        '---------------------------------------',
        `  Event:      ${booking.event_type}`,
        `  Date:       ${dateFormatted}`,
        `  Time:       ${timeRange}`,
        `  Location:   ${booking.location || booking.city || 'TBD'}`,
        '---------------------------------------',
        '',
        '---------------------------------------',
        '  PAYMENT BREAKDOWN',
        '---------------------------------------',
        `  Total:              $${fmt(amount)}`,
        `  Deposit (25%):      $${fmt(deposit)}`,
        `  Balance Due:        $${fmt(balance)}`,
        '---------------------------------------',
        '',
        `  Deposit Due By:     ${depositDueStr}`,
        `  Balance Due:        Day of event`,
        '',
        '---------------------------------------',
        '  PAYPAL PAYMENT INFO',
        '---------------------------------------',
        `  If paying deposit via PayPal:`,
        `    Deposit:          $${fmt(deposit)}`,
        `    PayPal Fee:       $${fmt(depositPayPal.fee)}`,
        `    Total to Send:    $${fmt(depositPayPal.total)}`,
        '',
        `  If paying balance via PayPal:`,
        `    Balance:          $${fmt(balance)}`,
        `    PayPal Fee:       $${fmt(balancePayPal.fee)}`,
        `    Total to Send:    $${fmt(balancePayPal.total)}`,
        '---------------------------------------',
        '',
        `  Pay Here: ${PAYPAL_LINK}`,
        '',
        'A 25% non-refundable deposit is required to lock in your date. The remaining balance is due the day of the event.',
        '',
        'If you have any questions or would like to discuss further, feel free to reply to this email or text me anytime.',
        '',
        'Looking forward to making your event unforgettable!',
        '',
        'Mask Off Da DJ',
        'maskoffdadj@gmail.com',
      ].join('\n')
    } else {
      subject = `Re: DJ Booking Inquiry - ${booking.event_type} on ${dateFormatted}`
      replyText = [
        `Hi ${booking.client_name},`,
        '',
        `Thank you for reaching out about your ${booking.event_type} on ${dateFormatted}! I am excited about the opportunity and would love to help make your event unforgettable.`,
        '',
        `I have received your request and that date is currently available. I would love to discuss packages and pricing that fit your needs.`,
        '',
        'Feel free to reply to this email, or you can reach me directly at maskoffdadj@gmail.com.',
        '',
        'Best,',
        'Mask Off Da DJ',
        'maskoffdadj@gmail.com',
      ].join('\n')
    }

    return NextResponse.json({ reply: replyText, subject })
  } catch (err: any) {
    console.error('[generate-reply]', err)
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 })
  }
}
