import { Router, Request, Response, NextFunction } from 'express';
import { getUserService } from '../services/user.service';
import { AppError } from '../errors';

const router = Router();
const userService = getUserService();

/**
 * Clerk Webhook Handler
 * Handles user lifecycle events from Clerk
 *
 * Webhook events:
 * - user.created: New user signed up
 * - user.updated: User updated their profile
 * - user.deleted: User deleted their account
 */

// Verify Clerk webhook signature (basic validation)
// In production, verify with CLERK_WEBHOOK_SECRET from Clerk Dashboard
function verifyWebhookSignature(req: Request): boolean {
  // TODO: Implement proper signature verification
  // For now, we'll rely on IP whitelist and HTTPS
  // Reference: https://clerk.com/docs/webhooks/overview
  return true;
}

/**
 * POST /api/webhooks/clerk
 * Handles all Clerk webhook events
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify webhook signature
    if (!verifyWebhookSignature(req)) {
      return next(
        new AppError('Invalid webhook signature', 401, 'INVALID_WEBHOOK_SIGNATURE')
      );
    }

    const event = req.body;
    const eventType = event.type;

    switch (eventType) {
      case 'user.created':
        await handleUserCreated(event.data);
        break;

      case 'user.updated':
        await handleUserUpdated(event.data);
        break;

      case 'user.deleted':
        await handleUserDeleted(event.data);
        break;

      default:
        // Ignore unknown events
        console.log(`Ignoring webhook event: ${eventType}`);
    }

    // Return 200 OK to acknowledge receipt
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/**
 * Handle user.created event from Clerk
 */
async function handleUserCreated(userData: any) {
  try {
    const user = await userService.onUserCreated({
      id: userData.id,
      email_addresses: userData.email_addresses || [],
      first_name: userData.first_name,
      last_name: userData.last_name,
    });

    console.log(`Created user: ${user.clerk_id} (${user.email})`);
  } catch (error) {
    console.error('Error creating user from Clerk webhook:', error);
    throw error;
  }
}

/**
 * Handle user.updated event from Clerk
 */
async function handleUserUpdated(userData: any) {
  try {
    const user = await userService.onUserUpdated({
      id: userData.id,
      email_addresses: userData.email_addresses || [],
      first_name: userData.first_name,
      last_name: userData.last_name,
    });

    console.log(`Updated user: ${user.clerk_id} (${user.email})`);
  } catch (error) {
    console.error('Error updating user from Clerk webhook:', error);
    // Don't throw - user might not exist yet in database
    // This can happen if user.created webhook was delayed
  }
}

/**
 * Handle user.deleted event from Clerk
 */
async function handleUserDeleted(userData: any) {
  try {
    await userService.onUserDeleted(userData.id);
    console.log(`Deleted user: ${userData.id}`);
  } catch (error) {
    console.error('Error deleting user from Clerk webhook:', error);
    // Don't throw - user might already be deleted
  }
}

export default router;
