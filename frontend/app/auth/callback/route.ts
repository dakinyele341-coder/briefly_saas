import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { saveCredentials } from '@/utils/api'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in search params, use it as the redirection URL
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data.session) {
            const user = data.session.user
            const providerToken = data.session.provider_token
            const providerRefreshToken = data.session.provider_refresh_token

            // If we have a provider token (Google), we can auto-link the credentials
            if (providerToken && user.email) {
                try {
                    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

                    // Format for Google's from_authorized_user_info
                    const credentialsObject = {
                        token: providerToken,
                        refresh_token: providerRefreshToken || null,
                        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
                        scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
                        universe_domain: "googleapis.com",
                        account: "",
                        expiry: null
                    }

                    // Call backend to save credentials
                    await fetch(`${BACKEND_URL}/api/save-credentials`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_id: user.id,
                            credentials_json: JSON.stringify(credentialsObject)
                        })
                    })

                    console.log('Successfully auto-linked Google credentials for:', user.email)
                } catch (err) {
                    console.error('Failed to auto-link credentials in callback:', err)
                }
            }

            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
