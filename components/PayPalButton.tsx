'use client'

import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js'
import { useState, useEffect } from 'react'
import { isPayPalEnabled } from '@/lib/paypal'
import Loading from './Loading'

interface PayPalButtonProps {
  onSuccess?: () => void
}

interface PlanValidation {
  valid: boolean
  planId?: string
  currency?: string
  planName?: string
  error?: string
  details?: string
}

export default function PayPalButton({ onSuccess }: PayPalButtonProps) {
  // Hooks must be called unconditionally - always call this
  const [{ isPending }] = usePayPalScriptReducer()
  const [error, setError] = useState<string | null>(null)
  const [planId, setPlanId] = useState<string | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [planValidation, setPlanValidation] = useState<PlanValidation | null>(null)

  // Fetch and validate plan ID from API
  useEffect(() => {
    const fetchAndValidatePlan = async () => {
      if (!isPayPalEnabled()) {
        setLoadingPlan(false)
        return
      }

      try {
        // Step 1: Get plan ID
        const planResponse = await fetch('/api/paypal/get-plan')
        if (!planResponse.ok) {
          const errorData = await planResponse.json()
          throw new Error(errorData.error || 'Failed to get PayPal plan')
        }
        const planData = await planResponse.json()
        console.log('PayPal plan fetched:', { planId: planData.planId, source: planData.source })
        
        if (!planData.planId || typeof planData.planId !== 'string' || planData.planId.trim().length === 0) {
          throw new Error('Invalid plan ID received from server')
        }
        
        const fetchedPlanId = planData.planId.trim()
        setPlanId(fetchedPlanId)

        // Step 2: Validate the plan (check if it exists, is active, and currency matches)
        const validateResponse = await fetch(`/api/paypal/validate-plan?planId=${encodeURIComponent(fetchedPlanId)}`)
        const validation: PlanValidation = await validateResponse.json()
        setPlanValidation(validation)

        if (!validation.valid) {
          throw new Error(validation.details || validation.error || 'Plan validation failed')
        }

        console.log('PayPal plan validated:', { 
          planId: validation.planId, 
          currency: validation.currency,
          planName: validation.planName 
        })
      } catch (err: any) {
        console.error('Error fetching/validating PayPal plan:', err)
        setError(err.message || 'Failed to load PayPal subscription plan')
      } finally {
        setLoadingPlan(false)
      }
    }

    fetchAndValidatePlan()
  }, [])

  // Check if PayPal is enabled - show message if not
  if (!isPayPalEnabled()) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-yellow-800 text-sm">
          PayPal is not configured. Please set NEXT_PUBLIC_PAYPAL_CLIENT_ID in your environment variables.
        </p>
      </div>
    )
  }

  if (loadingPlan) {
    return <Loading message="Loading subscription plan..." size="sm" className="py-4" />
  }

  if (!planId || !planValidation?.valid) {
    const errorMessage = error || 
      planValidation?.details || 
      planValidation?.error || 
      'Failed to load PayPal subscription plan. Please try again later.'
    
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800 text-sm font-medium mb-2">
          {planValidation?.error || 'PayPal Subscription Error'}
        </p>
        <p className="text-red-700 text-sm">
          {errorMessage}
        </p>
        {planValidation?.error === 'Currency mismatch' && (
          <p className="text-red-600 text-xs mt-2">
            Please ensure your PayPal plan uses CAD currency to match the application settings.
          </p>
        )}
      </div>
    )
  }

  const createSubscription = async () => {
    // PayPal expects createSubscription to return a Promise that resolves to the plan ID
    if (!planId) {
      throw new Error('Plan ID is not available')
    }
    
    if (!planValidation?.valid) {
      throw new Error('Plan validation failed. Please refresh the page and try again.')
    }
    
    const trimmedPlanId = planId.trim()
    
    // Log the plan ID being used for debugging
    console.log('Creating PayPal subscription:', { 
      planId: trimmedPlanId,
      currency: planValidation.currency,
      planName: planValidation.planName
    })
    
    // Basic validation - PayPal plan IDs typically start with 'P-' but we'll be lenient
    // and let PayPal validate it
    if (trimmedPlanId.length === 0) {
      throw new Error('Plan ID cannot be empty')
    }
    
    // Return the plan ID - PayPal SDK will use this to create the subscription
    return trimmedPlanId
  }

  const onApprove = async (data: any) => {
    try {
      // PayPal subscription approval data structure
      const subscriptionId = data.subscriptionID || data.orderID
      
      if (!subscriptionId) {
        throw new Error('No subscription ID received from PayPal')
      }

      const response = await fetch('/api/paypal/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscriptionId,
          planId: planId!,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create subscription')
      }

      if (onSuccess) {
        onSuccess()
      } else {
        window.location.reload()
      }
    } catch (err: any) {
      console.error('PayPal subscription approval error:', err)
      setError(err.message || 'An error occurred')
    }
  }

  const onError = (err: any) => {
    console.error('PayPal subscription creation error:', {
      error: err,
      planId,
      planValidation,
      fullError: JSON.stringify(err, null, 2)
    })
    
    // PayPal error object structure
    const errorMessage = err?.err || err?.message || 'Unknown PayPal error'
    const errorDetails = err?.details || (err?.buttonCorrelationID ? `Correlation ID: ${err.buttonCorrelationID}` : '')
    
    // Provide more helpful error messages based on error type
    let userMessage = `PayPal error: ${errorMessage}`
    
    if (errorMessage === 'INVALID_REQUEST') {
      userMessage = `PayPal subscription error: The request is invalid. This usually means:
- The plan ID (${planId}) doesn't exist or is inactive in your PayPal account
- There's a currency mismatch (plan must use CAD)
- The plan configuration doesn't match PayPal's requirements

Please verify your PayPal plan settings and ensure the plan is active with CAD currency.`
    } else if (errorDetails) {
      userMessage += ` (${errorDetails})`
    }
    
    setError(userMessage)
  }

  if (isPending) {
    return <Loading message="Loading PayPal..." size="sm" className="py-4" />
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
      <PayPalButtons
        createSubscription={createSubscription}
        onApprove={onApprove}
        onError={onError}
        style={{
          layout: 'vertical',
          color: 'blue',
          shape: 'rect',
          label: 'subscribe',
        }}
      />
    </div>
  )
}

