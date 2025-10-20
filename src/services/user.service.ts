import { getUsersRepo, User, UserTier } from '../data/users.repo';
import { AppError } from '../errors';

export class UserService {
  private usersRepo = getUsersRepo();

  /**
   * Handle Clerk user.created event
   * Creates a new user record in the database
   */
  async onUserCreated(data: {
    id: string; // Clerk user ID
    email_addresses: Array<{ email_address: string; primary: boolean }>;
    first_name?: string;
    last_name?: string;
  }): Promise<User> {
    // Check if user already exists
    const existing = await this.usersRepo.getByClerkId(data.id);
    if (existing) {
      return existing;
    }

    const primaryEmail = data.email_addresses.find((e) => e.primary)?.email_address;
    if (!primaryEmail) {
      throw new AppError(
        'No primary email address in Clerk user',
        400,
        'INVALID_CLERK_USER'
      );
    }

    const fullName = [data.first_name, data.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();

    // Create user with free tier by default
    const user = await this.usersRepo.create({
      clerk_id: data.id,
      email: primaryEmail,
      name: fullName || undefined,
      tier: 'free', // Default tier for new users
    });

    return user;
  }

  /**
   * Handle Clerk user.updated event
   * Updates user information (email, name)
   */
  async onUserUpdated(data: {
    id: string; // Clerk user ID
    email_addresses: Array<{ email_address: string; primary: boolean }>;
    first_name?: string;
    last_name?: string;
  }): Promise<User> {
    const primaryEmail = data.email_addresses.find((e) => e.primary)?.email_address;
    if (!primaryEmail) {
      throw new AppError(
        'No primary email address in Clerk user',
        400,
        'INVALID_CLERK_USER'
      );
    }

    const fullName = [data.first_name, data.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();

    const user = await this.usersRepo.update(data.id, {
      email: primaryEmail,
      name: fullName || undefined,
    });

    return user;
  }

  /**
   * Handle Clerk user.deleted event
   * Soft-delete the user record
   */
  async onUserDeleted(clerkId: string): Promise<void> {
    await this.usersRepo.deactivate(clerkId);
  }

  /**
   * Get user by Clerk ID for authentication
   */
  async getUserByClerkId(clerkId: string): Promise<User> {
    const user = await this.usersRepo.getByClerkId(clerkId);
    if (!user) {
      // User doesn't exist in database yet, create placeholder
      // This shouldn't happen if webhooks are working, but provides fallback
      throw new AppError(
        'User not found in database. Please sign out and sign back in.',
        404,
        'USER_NOT_FOUND'
      );
    }
    return user;
  }

  /**
   * Check if user can perform action based on tier
   */
  canUserCreateLayout(tier: UserTier, currentCount: number): boolean {
    const limits: Record<UserTier, number> = {
      free: 3,
      paid_individual: 50,
      club_admin: 100,
      admin: -1, // Unlimited
    };

    const limit = limits[tier];
    if (limit === -1) return true; // Admin - unlimited

    return currentCount < limit;
  }

  /**
   * Get tier display name
   */
  getTierDisplayName(tier: UserTier): string {
    const names: Record<UserTier, string> = {
      free: 'Free',
      paid_individual: 'Paid Individual',
      club_admin: 'Club Admin',
      admin: 'Admin',
    };
    return names[tier];
  }

  /**
   * Check if user is admin
   */
  isAdmin(tier: UserTier): boolean {
    return tier === 'admin';
  }

  /**
   * Check if user is paid (any tier other than free)
   */
  isPaid(tier: UserTier): boolean {
    return tier !== 'free';
  }

  /**
   * Get user analytics
   */
  async getAnalytics(): Promise<{
    total: number;
    byTier: Record<UserTier, number>;
  }> {
    const total = await this.usersRepo.countActive();
    const byTier = await this.usersRepo.countByTier();

    return { total, byTier };
  }
}

/**
 * Singleton instance
 */
let userService: UserService | null = null;

export function getUserService(): UserService {
  if (!userService) {
    userService = new UserService();
  }
  return userService;
}
