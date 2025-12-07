'use client'

import { PayPalScriptProvider } from '@paypal/react-paypal-js'
import { getPayPalClientId, isPayPalEnabled } from '@/lib/paypal'
import { useEffect } from 'react'

export default function PayPalProvider({ children }: { children: React.ReactNode }) {
  const clientId = getPayPalClientId()
  
  // Check if PayPal is properly configured
  const shouldEnablePayPal = isPayPalEnabled() && clientId && 
    !clientId.includes('your_paypal') && 
    !clientId.includes('placeholder') &&
    clientId.trim().length > 0

  // Always render the provider so hooks can be used
  // Use the actual client ID if enabled, or a placeholder if not
  // The PayPalButton component will handle showing appropriate messages
  const effectiveClientId = shouldEnablePayPal ? clientId! : 'placeholder-client-id'

  // Log PayPal configuration in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('PayPal Provider Configuration:', {
        enabled: shouldEnablePayPal,
        clientId: shouldEnablePayPal ? effectiveClientId.substring(0, 20) + '...' : 'placeholder',
        currency: 'CAD',
        intent: 'subscription',
        environment: process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT || 'sandbox'
      })
    }
  }, [shouldEnablePayPal, effectiveClientId])

  // PayPal SDK options - currency MUST match the plan currency (CAD)
  const paypalOptions = {
    clientId: effectiveClientId,
    currency: 'CAD', // Must match your PayPal plan currency
    intent: 'subscription' as const,
    vault: true,
    // Enable debug mode in development
    debug: process.env.NODE_ENV === 'development',
  }

  return (
    <PayPalScriptProvider options={paypalOptions}>
      {children}
    </PayPalScriptProvider>
  )
}

