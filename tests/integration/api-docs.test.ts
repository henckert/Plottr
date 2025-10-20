/**
 * API Documentation Integration Tests
 * Validates that OpenAPI spec is accessible and contains Sites/Layouts endpoints
 */

process.env.DATABASE_URL_TEST = process.env.DATABASE_URL_TEST || 'postgres://postgres:postgres@localhost:5432/plottr_test';

import request from 'supertest';
import createApp from '../../src/app';

const app = createApp();

describe('API Documentation', () => {
  describe('GET /api/openapi.json', () => {
    it('should return OpenAPI spec', async () => {
      const response = await request(app)
        .get('/api/openapi.json')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('paths');
      expect(response.body.info.title).toBe('Plottr API');
    });

    it('should include Sites endpoints in OpenAPI spec', async () => {
      const response = await request(app)
        .get('/api/openapi.json')
        .expect(200);

      const paths = response.body.paths;

      // Verify Sites paths exist
      expect(paths).toHaveProperty('/sites');
      expect(paths).toHaveProperty('/sites/{id}');

      // Verify Sites GET endpoint
      expect(paths['/sites']).toHaveProperty('get');
      expect(paths['/sites'].get.summary).toContain('List sites');
      expect(paths['/sites'].get.tags).toContain('Sites');

      // Verify Sites POST endpoint
      expect(paths['/sites']).toHaveProperty('post');
      expect(paths['/sites'].post.summary).toContain('Create a site');

      // Verify Sites PUT endpoint
      expect(paths['/sites/{id}']).toHaveProperty('put');
      expect(paths['/sites/{id}'].put.summary).toContain('Update a site');

      // Verify Sites DELETE endpoint
      expect(paths['/sites/{id}']).toHaveProperty('delete');
      expect(paths['/sites/{id}'].delete.summary).toContain('Delete a site');
    });

    it('should include Layouts endpoints in OpenAPI spec', async () => {
      const response = await request(app)
        .get('/api/openapi.json')
        .expect(200);

      const paths = response.body.paths;

      // Verify Layouts paths exist
      expect(paths).toHaveProperty('/layouts');
      expect(paths).toHaveProperty('/layouts/{id}');

      // Verify Layouts GET endpoint
      expect(paths['/layouts']).toHaveProperty('get');
      expect(paths['/layouts'].get.summary).toContain('List layouts');
      expect(paths['/layouts'].get.tags).toContain('Layouts');

      // Verify Layouts POST endpoint
      expect(paths['/layouts']).toHaveProperty('post');
      expect(paths['/layouts'].post.summary).toContain('Create a layout');

      // Verify Layouts PUT endpoint
      expect(paths['/layouts/{id}']).toHaveProperty('put');
      expect(paths['/layouts/{id}'].put.summary).toContain('Update a layout');

      // Verify Layouts DELETE endpoint
      expect(paths['/layouts/{id}']).toHaveProperty('delete');
      expect(paths['/layouts/{id}'].delete.summary).toContain('Delete a layout');
    });

    it('should include Site and Layout schemas in OpenAPI spec', async () => {
      const response = await request(app)
        .get('/api/openapi.json')
        .expect(200);

      const schemas = response.body.components.schemas;

      // Verify Site schemas
      expect(schemas).toHaveProperty('Site');
      expect(schemas).toHaveProperty('SiteCreate');
      expect(schemas).toHaveProperty('SiteUpdate');

      // Verify Layout schemas
      expect(schemas).toHaveProperty('Layout');
      expect(schemas).toHaveProperty('LayoutCreate');
      expect(schemas).toHaveProperty('LayoutUpdate');

      // Verify Site schema properties
      expect(schemas.Site.properties).toHaveProperty('id');
      expect(schemas.Site.properties).toHaveProperty('club_id');
      expect(schemas.Site.properties).toHaveProperty('name');
      expect(schemas.Site.properties).toHaveProperty('location');
      expect(schemas.Site.properties).toHaveProperty('version_token');

      // Verify Layout schema properties
      expect(schemas.Layout.properties).toHaveProperty('id');
      expect(schemas.Layout.properties).toHaveProperty('site_id');
      expect(schemas.Layout.properties).toHaveProperty('name');
      expect(schemas.Layout.properties).toHaveProperty('description');
      expect(schemas.Layout.properties).toHaveProperty('is_published');
      expect(schemas.Layout.properties).toHaveProperty('version_token');
    });

    it('should include pagination parameters in Sites/Layouts endpoints', async () => {
      const response = await request(app)
        .get('/api/openapi.json')
        .expect(200);

      const paths = response.body.paths;

      // Verify Sites pagination parameters
      const sitesGetParams = paths['/sites'].get.parameters;
      const cursorParam = sitesGetParams.find((p: any) => p.name === 'cursor');
      const limitParam = sitesGetParams.find((p: any) => p.name === 'limit');

      expect(cursorParam).toBeDefined();
      expect(cursorParam.description).toContain('cursor');
      expect(limitParam).toBeDefined();
      expect(limitParam.schema.maximum).toBe(100);
      expect(limitParam.schema.default).toBe(50);

      // Verify Layouts pagination parameters
      const layoutsGetParams = paths['/layouts'].get.parameters;
      const layoutsCursorParam = layoutsGetParams.find((p: any) => p.name === 'cursor');
      const layoutsLimitParam = layoutsGetParams.find((p: any) => p.name === 'limit');

      expect(layoutsCursorParam).toBeDefined();
      expect(layoutsLimitParam).toBeDefined();
      expect(layoutsLimitParam.schema.maximum).toBe(100);
    });

    it('should include version control headers in update/delete operations', async () => {
      const response = await request(app)
        .get('/api/openapi.json')
        .expect(200);

      const paths = response.body.paths;

      // Verify Sites PUT has If-Match header
      const sitesPutParams = paths['/sites/{id}'].put.parameters;
      const sitesIfMatch = sitesPutParams.find((p: any) => p.name === 'If-Match');
      expect(sitesIfMatch).toBeDefined();
      expect(sitesIfMatch.required).toBe(true);
      expect(sitesIfMatch.description).toContain('version_token');

      // Verify Sites DELETE has If-Match header
      const sitesDeleteParams = paths['/sites/{id}'].delete.parameters;
      const sitesDeleteIfMatch = sitesDeleteParams.find((p: any) => p.name === 'If-Match');
      expect(sitesDeleteIfMatch).toBeDefined();
      expect(sitesDeleteIfMatch.required).toBe(true);

      // Verify Layouts PUT has If-Match header
      const layoutsPutParams = paths['/layouts/{id}'].put.parameters;
      const layoutsIfMatch = layoutsPutParams.find((p: any) => p.name === 'If-Match');
      expect(layoutsIfMatch).toBeDefined();
      expect(layoutsIfMatch.required).toBe(true);

      // Verify Layouts DELETE has If-Match header
      const layoutsDeleteParams = paths['/layouts/{id}'].delete.parameters;
      const layoutsDeleteIfMatch = layoutsDeleteParams.find((p: any) => p.name === 'If-Match');
      expect(layoutsDeleteIfMatch).toBeDefined();
      expect(layoutsDeleteIfMatch.required).toBe(true);
    });

    it('should include error responses for Sites/Layouts endpoints', async () => {
      const response = await request(app)
        .get('/api/openapi.json')
        .expect(200);

      const paths = response.body.paths;
      const responses = response.body.components.responses;

      // Verify error response definitions exist
      expect(responses).toHaveProperty('BadRequestError');
      expect(responses).toHaveProperty('UnauthorizedError');
      expect(responses).toHaveProperty('NotFoundError');
      expect(responses).toHaveProperty('ForbiddenError');
      expect(responses).toHaveProperty('VersionConflictError');

      // Verify Sites endpoints reference error responses
      expect(paths['/sites'].get.responses).toHaveProperty('400');
      expect(paths['/sites'].get.responses).toHaveProperty('401');
      expect(paths['/sites/{id}'].put.responses).toHaveProperty('404');
      expect(paths['/sites/{id}'].put.responses).toHaveProperty('409');
      expect(paths['/sites/{id}'].get.responses).toHaveProperty('403');

      // Verify Layouts endpoints reference error responses
      expect(paths['/layouts'].get.responses).toHaveProperty('403');
      expect(paths['/layouts/{id}'].put.responses).toHaveProperty('404');
      expect(paths['/layouts/{id}'].put.responses).toHaveProperty('409');
    });
  });

  describe('GET /api/docs', () => {
    it('should serve Swagger UI HTML', async () => {
      const response = await request(app)
        .get('/api/docs/')
        .expect('Content-Type', /html/)
        .expect(200);

      // Verify Swagger UI is present
      expect(response.text).toContain('swagger-ui');
    });
  });
});
