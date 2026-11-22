import { redirect } from 'next/navigation'

// Sign ups live on the home page now. Old links land there.
export default function Register() {
  redirect('/spades#signup')
}
