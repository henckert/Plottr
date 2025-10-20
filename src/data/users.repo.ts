import { getKnex } from './knex';

export type UserTier = 'free' | 'paid_individual' | 'club_admin' | 'admin';

export interface User {
  id: string;
  email: string;
  name?: string;
  clerk_id: string;
  tier: UserTier;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class UsersRepo {
  private knex: any;

  constructor() {
    this.knex = getKnex();
  }

  /**
   * Create a new user from Clerk webhook
   */
  async create(data: {
    clerk_id: string;
    email: string;
    name?: string;
    tier?: UserTier;
  }): Promise<User> {
    const [user] = await this.knex('users')
      .insert({
        clerk_id: data.clerk_id,
        email: data.email,
        name: data.name,
        tier: data.tier || 'free',
        is_active: true,
      })
      .returning('*');

    return user as User;
  }

  /**
   * Get user by Clerk ID
   */
  async getByClerkId(clerk_id: string): Promise<User | null> {
    const user = await this.knex('users')
      .where({ clerk_id, is_active: true })
      .first();

    return user || null;
  }

  /**
   * Get user by email
   */
  async getByEmail(email: string): Promise<User | null> {
    const user = await this.knex('users')
      .where({ email, is_active: true })
      .first();

    return user || null;
  }

  /**
   * Update user (used for tier changes, name updates, etc.)
   */
  async update(
    clerk_id: string,
    data: Partial<Omit<User, 'id' | 'clerk_id' | 'created_at'>>
  ): Promise<User> {
    const [user] = await this.knex('users')
      .where({ clerk_id })
      .update({
        ...data,
        updated_at: this.knex.fn.now(),
      })
      .returning('*');

    return user as User;
  }

  /**
   * Soft delete user (set is_active to false)
   */
  async deactivate(clerk_id: string): Promise<void> {
    await this.knex('users')
      .where({ clerk_id })
      .update({
        is_active: false,
        updated_at: this.knex.fn.now(),
      });
  }

  /**
   * Reactivate user
   */
  async reactivate(clerk_id: string): Promise<User> {
    const [user] = await this.knex('users')
      .where({ clerk_id })
      .update({
        is_active: true,
        updated_at: this.knex.fn.now(),
      })
      .returning('*');

    return user as User;
  }

  /**
   * Update user tier (for subscription changes)
   */
  async updateTier(clerk_id: string, tier: UserTier): Promise<User> {
    const [user] = await this.knex('users')
      .where({ clerk_id })
      .update({
        tier,
        updated_at: this.knex.fn.now(),
      })
      .returning('*');

    return user as User;
  }

  /**
   * List all active users (for admin dashboard)
   */
  async listActive(limit = 100, offset = 0): Promise<User[]> {
    return this.knex('users')
      .where({ is_active: true })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get user count by tier
   */
  async countByTier(): Promise<Record<UserTier, number>> {
    const results = await this.knex('users')
      .where({ is_active: true })
      .select('tier')
      .count('* as count')
      .groupBy('tier');

    const counts: Record<UserTier, number> = {
      free: 0,
      paid_individual: 0,
      club_admin: 0,
      admin: 0,
    };

    results.forEach((row: any) => {
      counts[row.tier as UserTier] = parseInt(row.count, 10);
    });

    return counts;
  }

  /**
   * Get total active users
   */
  async countActive(): Promise<number> {
    const result = await this.knex('users')
      .where({ is_active: true })
      .count('* as count')
      .first();

    return parseInt(result.count, 10);
  }
}

/**
 * Singleton instance
 */
let usersRepo: UsersRepo | null = null;

export function getUsersRepo(): UsersRepo {
  if (!usersRepo) {
    usersRepo = new UsersRepo();
  }
  return usersRepo;
}
