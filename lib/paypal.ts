import { PayPalScriptProvider } from '@paypal/react-paypal-js'

export const paypalOptions = {
  'client-id': process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
  currency: 'CAD',
  intent: 'subscription',
  vault: true,
}

export function getPayPalClientId() {
  return process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ''
}

export function isPayPalEnabled() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ''
  return !!clientId && 
         !clientId.includes('your_paypal') && 
         !clientId.includes('placeholder') &&
         clientId.trim().length > 0
}

export function getPayPalPlanId(): string | null {
  const planId = process.env.PAYPAL_PLAN_ID || process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID || ''
  return planId && 
         !planId.includes('placeholder') && 
         planId.trim().length > 0 
    ? planId.trim() 
    : null
}

