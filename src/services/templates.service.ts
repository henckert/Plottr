import { TemplatesRepo } from '../data/templates.repo';
import { components } from '../types/openapi';

type Template = components['schemas']['Template'];

export class TemplatesService {
  private repo: TemplatesRepo;

  constructor() {
    this.repo = new TemplatesRepo();
  }

  async list(): Promise<Template[]> {
    // Business rules go here (filtering, transformations, caching)
    const rows = await this.repo.listAll();
    const toIso = (v: any) => {
      if (v == null) return undefined;
      if (typeof v === 'string') return v;
      if (v instanceof Date) return v.toISOString();
      try {
        return new Date(v).toISOString();
      } catch {
        return String(v);
      }
    };

    return rows.map((r: any) => ({
      id: r.id,
      template_id: r.template_id,
      name: r.name,
      meta: r.meta,
      created_at: toIso(r.created_at),
      updated_at: toIso(r.updated_at),
    } as Template));
  }
}

