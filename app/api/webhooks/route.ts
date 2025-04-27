
import { clerkClient, WebhookEvent } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import { headers } from 'next/headers';
import { Webhook } from 'svix';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const SIGNING_SECRET = process.env.SIGNING_SECRET;

  if (!SIGNING_SECRET) {
    throw new Error('Error: Please add SIGNING_SECRET from Clerk Dashboard to .env or .env');
  }

  const wh = new Webhook(SIGNING_SECRET);
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing Svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, { 'svix-id': svix_id, 'svix-timestamp': svix_timestamp, 'svix-signature': svix_signature }) as WebhookEvent;
  } catch (err) {
    console.error('Error: Could not verify webhook:', err);
    return new Response('Error: Verification error', { status: 400 });
  }

  const eventType = evt.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const userId = evt.data.id;
    const email = evt.data.email_addresses[0]?.email_address;
    const name = `${evt.data.first_name || ''} ${evt.data.last_name || ''}`.trim();
    const image = evt.data.image_url;
    let role: "POSTER" | "DOER" | "ADMIN" = "DOER"; // Default role

    if (!userId) {
      return new Response('Error: User ID not found in webhook payload', { status: 400 });
    }

    try {
      const client = await clerkClient();

      if (eventType === 'user.created') {
        // Set default role in Clerk metadata
        await client.users.updateUserMetadata(userId, { publicMetadata: { role: 'DOER' } });
        console.log(`Assigned default role 'DOER' to user with ID ${userId}`);

        // Create user in database
        await prisma.user.create({
          data: {
            id: userId,
            name: name,
            email: email,
            image: image,
            role: role,
          },
        });

        console.log(`User created in database with ID ${userId}`);
      } else if (eventType === 'user.updated') {
        const clerkUser = await client.users.getUser(userId);
        
        // Get role from metadata and map to the Prisma Role
        if (clerkUser.publicMetadata && clerkUser.publicMetadata.role) {
          const metadataRole = clerkUser.publicMetadata.role as string;
          if (metadataRole.toUpperCase() === 'POSTER') {
            role = "POSTER";
          } else if (metadataRole.toUpperCase() === 'ADMIN') {
            role = "ADMIN";
          }
        }

        // Update user in database
        await prisma.user.update({
          where: { id: userId },
          data: {
            name: name,
            email: email,
            image: image,
            role: role,
          },
        });

        console.log(`User updated in database with ID ${userId} and role ${role}`);
      }
    } catch (error) {
      console.error('Error processing user:', error);
      return new Response('Error: Could not process user', { status: 500 });
    }
  }

  return new Response('Webhook processed successfully', { status: 200 });
}
