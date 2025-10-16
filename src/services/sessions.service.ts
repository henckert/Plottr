import { SessionsRepo } from '../data/sessions.repo';

export class SessionsService {
  private repo = new SessionsRepo();

  async list() {
    return this.repo.listAll();
  }

  async get(id: number) {
    return this.repo.getById(id);
  }

  async create(payload: any) {
    return this.repo.create(payload);
  }
}
