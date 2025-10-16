import { TemplatesRepo } from '../data/templates.repo';

export class TemplatesService {
  private repo: TemplatesRepo;

  constructor() {
    this.repo = new TemplatesRepo();
  }

  async list() {
    // Business rules go here (filtering, transformations, caching)
    const rows = await this.repo.listAll();
    return rows.map((r: any) => ({
      id: r.id,
      template_id: r.template_id,
      name: r.name,
      meta: r.meta,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }
}
