import { redirect } from 'next/navigation'

// For all org subdomains: unauthenticated visitors land on login.
// The login page redirects authenticated users to /discussions.
export default function Home() {
  redirect('/login')
}
