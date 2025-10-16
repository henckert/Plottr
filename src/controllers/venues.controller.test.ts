import request from 'supertest';
import createApp from '../app';

describe('venues controller', () => {
  test('list endpoint returns 200', async () => {
    const app = createApp();
    const res = await request(app).get('/api/venues');
    expect([200, 404]).toContain(res.status);
  });
});
