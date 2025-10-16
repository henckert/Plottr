import { PitchesRepo } from '../data/pitches.repo';

export class PitchesService {
  private repo = new PitchesRepo();

  async list(venueId?: number) {
    return this.repo.listAll(venueId);
  }

  async get(id: number) {
    return this.repo.getById(id);
  }

  async create(payload: any) {
    return this.repo.create(payload);
  }
}
