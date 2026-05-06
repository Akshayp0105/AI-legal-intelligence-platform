import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { Pool } from 'pg'

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function POST(req: Request) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  // Get the headers
  const headerPayload = headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400
    })
  }

  const eventType = evt.type

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data
    const primaryEmail = email_addresses[0]?.email_address
    const name = [first_name, last_name].filter(Boolean).join(' ')

    try {
      const query = `
        INSERT INTO users (id, clerk_id, email, name, role, created_at, subscription_tier)
        VALUES (gen_random_uuid(), $1, $2, $3, 'public', NOW(), 'free')
        ON CONFLICT (clerk_id) DO NOTHING;
      `
      await pool.query(query, [id, primaryEmail, name])
      console.log(`User ${id} synced to database.`)
    } catch (error) {
      console.error('Database insertion error:', error)
      return new Response('Database error', { status: 500 })
    }
  } else if (eventType === 'user.deleted') {
    const { id } = evt.data
    try {
      await pool.query(`DELETE FROM users WHERE clerk_id = $1`, [id])
      console.log(`User ${id} deleted from database.`)
    } catch (error) {
      console.error('Database deletion error:', error)
      return new Response('Database error', { status: 500 })
    }
  }

  return new Response('', { status: 200 })
}
