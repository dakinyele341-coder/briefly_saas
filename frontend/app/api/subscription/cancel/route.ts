import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { reason } = await request.json()
        // Reason is optional but good for analytics.

        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Fetch user profile to get Flutterwave subscription ID
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('flutterwave_subscription_id, subscription_status')
            .eq('id', user.id)
            .single()

        if (profileError || !profile) {
            console.error('Error fetching profile:', profileError)
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            )
        }

        if (!profile.flutterwave_subscription_id) {
            // If there's no subscription ID, we can't cancel at Flutterwave.
            // It's possible they are on a legacy plan or manual status.
            // We'll return an error or handle gracefully.
            return NextResponse.json(
                { error: 'No active Flutterwave subscription found to cancel.' },
                { status: 400 }
            )
        }

        // Call Flutterwave API
        const flwSecretKey = process.env.FLUTTERWAVE_SECRET_KEY
        if (!flwSecretKey) {
            console.error('FLUTTERWAVE_SECRET_KEY is not set')
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
        }

        const response = await fetch(`https://api.flutterwave.com/v3/subscriptions/${profile.flutterwave_subscription_id}/cancel`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${flwSecretKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({}) // Empty body usually for this endpoint, check docs if needed
        })

        const flwData = await response.json()

        if (!response.ok || flwData.status !== 'success') {
            console.error('Flutterwave cancellation failed:', flwData)
            return NextResponse.json(
                { error: flwData.message || 'Failed to cancel subscription with payment provider.' },
                { status: 502 }
            )
        }

        // Update Supabase
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ subscription_status: 'cancelled_pending' })
            .eq('id', user.id)

        if (updateError) {
            console.error('Error updating profile status:', updateError)
            // Note: Flutterwave sub IS cancelled, but DB update failed. 
            // We should warn the user or retry, but for now returning 500.
            return NextResponse.json(
                { error: 'Subscription cancelled but local status update failed. Please contact support.' },
                { status: 500 }
            )
        }

        // Log the cancellation reason (console for now as per plan)
        console.log(`User ${user.id} (${user.email}) cancelled subscription. Reason: ${reason}`)

        // In a real app, insertion into a 'cancellations' or 'feedback' table would go here.

        return NextResponse.json({
            success: true,
            message: 'Subscription cancelled successfully. You retain access until the period ends.'
        })

    } catch (error: any) {
        console.error('Cancel API Error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
