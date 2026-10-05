import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { deriveTicketKeys } from './tickets';
import { createTestDb } from './test/db';

let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ronikov-dist-'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<div id="root"></div>');
  fs.writeFileSync(path.join(dir, 'app.js'), 'console.log(1)');
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.writeFileSync(path.join(dir, 'assets', 'index-abc123.js'), 'console.log(2)');
  app = createApp(await createTestDb(), { ticketKeys: deriveTicketKeys('test-secret'), staticDir: dir });
});

describe('serving the built front-end', () => {
  it('serves files and falls back to index.html for app pages', async () => {
    expect((await request(app).get('/app.js')).text).toBe('console.log(1)');
    const page = await request(app).get('/stations/st-01');
    expect(page.status).toBe(200);
    expect(page.text).toContain('root');
  });

  it('lets browsers keep hashed build files', async () => {
    const res = await request(app).get('/assets/index-abc123.js').expect(200);
    expect(res.headers['cache-control']).toContain('immutable');
  });

  it('keeps unknown API routes as JSON 404s', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Route inconnue');
  });
});
