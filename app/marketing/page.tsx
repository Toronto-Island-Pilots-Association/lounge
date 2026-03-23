import { ClubLoungeLanding } from '@/components/club-lounge/ClubLoungeLanding'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'clublounge.app'
const IS_DEV = process.env.NODE_ENV === 'development'
const PROTOCOL = IS_DEV ? 'http' : 'https'
const PORT = IS_DEV ? ':3000' : ''

export default function MarketingHome() {
  const platformOrigin = `${PROTOCOL}://platform.${ROOT_DOMAIN}${PORT}`
  const demoOrigin = `${PROTOCOL}://tipa.${ROOT_DOMAIN}${PORT}`

  return (
    <ClubLoungeLanding
      rootDomain={ROOT_DOMAIN}
      signupHref={`${platformOrigin}/signup`}
      demoHref={demoOrigin}
      internalLinks={false}
    />
  )
}
