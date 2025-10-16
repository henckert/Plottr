import request from 'supertest';
import createApp from '../app';

describe('pitches controller', () => {
  test('list endpoint returns 200 or 404', async () => {
    const app = createApp();
    const res = await request(app).get('/api/pitches');
    expect([200, 404]).toContain(res.status);
  });
});
