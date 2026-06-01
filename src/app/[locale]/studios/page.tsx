import { redirect } from 'next/navigation'

export default function StudiosRedirect() {
  redirect('/venues?type=studio')
}
