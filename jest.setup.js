// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Polyfill for Request/Response (needed for Next.js API routes in tests)
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
// @ts-ignore
global.TextDecoder = TextDecoder

// Use Node's native fetch API (Node 18+)
// This provides Request, Response, and Headers
if (typeof global.fetch === 'undefined') {
  // @ts-ignore
  const { fetch, Request, Response, Headers } = require('undici')
  global.fetch = fetch
  global.Request = Request
  global.Headers = Headers
  
  // Add static json method to Response (needed for NextResponse.json)
  if (!Response.json) {
    Response.json = function(body, init) {
      return new Response(JSON.stringify(body), {
        status: init?.status || 200,
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers,
        },
      })
    }
  }
  
  global.Response = Response
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
      updateUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        remove: jest.fn(),
        getPublicUrl: jest.fn(),
      })),
    },
  })),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        remove: jest.fn(),
        getPublicUrl: jest.fn(),
      })),
    },
  })),
}))

// Mock org lib
jest.mock('@/lib/org', () => ({
  getOrgByHostname: jest.fn(() => Promise.resolve({
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'Test Org',
    slug: 'test',
    custom_domain: null,
    subdomain: 'test',
    logo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })),
}))

// Mock next/headers to return org id
jest.mock('next/headers', () => ({
  headers: jest.fn(() => Promise.resolve({
    get: jest.fn((key) => {
      if (key === 'x-org-id') return 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      if (key === 'x-org-slug') return 'test'
      if (key === 'authorization') return null
      return null
    }),
  })),
  cookies: jest.fn(() => Promise.resolve({
    getAll: jest.fn(() => []),
    set: jest.fn(),
  })),
}))

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.RESEND_API_KEY = 'test-resend-key'
process.env.RESEND_FROM_EMAIL = 'test@example.com'
process.env.NEXT_PUBLIC_APP_URL = 'http://clublounge.local:3000'
process.env.NEXT_PUBLIC_ROOT_DOMAIN = 'clublounge.app'
