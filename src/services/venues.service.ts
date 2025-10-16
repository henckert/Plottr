import { VenuesRepo } from '../data/venues.repo';
import type { Venue } from '../schemas/venues.schema';

export class VenuesService {
  private repo = new VenuesRepo();

  async list(): Promise<Venue[]> {
    return this.repo.listAll();
  }

  async get(id: number): Promise<Venue | null> {
    return this.repo.getById(id);
  }

  async create(payload: Partial<Venue>): Promise<Venue> {
    return this.repo.create(payload as Venue);
  }
}
