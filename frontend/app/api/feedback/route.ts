import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { message, category, email } = await request.json()

        if (!message) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        const { error } = await supabase
            .from('feedback')
            .insert([
                {
                    message,
                    category: category || 'General',
                    user_email: email || null,
                    is_read: false,
                },
            ])

        if (error) {
            console.error('Error inserting feedback:', error)
            return NextResponse.json(
                { error: 'Failed to save feedback' },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('API Error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}
