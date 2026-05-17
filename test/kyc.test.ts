import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { sequelize } from '../src/config/db.js';
import '../src/models/index.js';
import { computeRiskScore } from '../src/services/kycService.js';

const app = createApp();

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

beforeEach(async () => {
  await sequelize.sync({ force: true });
});

async function registerAndLogin(email = 'alice@example.com'): Promise<string> {
  const res = await request(app).post('/api/auth/register').send({ email, password: 'supersecret123' });
  expect(res.status).toBe(201);
  return res.body.token;
}

describe('Risk scoring', () => {
  it('flags underage applicants as high-risk', () => {
    const score = computeRiskScore({
      fullName: 'Test Kid',
      dateOfBirth: '2020-01-01',
      nationality: 'DE',
      documentType: 'passport',
      documentNumber: 'X1234567',
    });
    expect(score).toBeGreaterThanOrEqual(60);
  });

  it('keeps low-risk adults near zero', () => {
    const score = computeRiskScore({
      fullName: 'Jane Doe',
      dateOfBirth: '1992-06-15',
      nationality: 'NL',
      documentType: 'passport',
      documentNumber: 'NL12345678',
    });
    expect(score).toBeLessThan(20);
  });

  it('flags high-risk jurisdictions', () => {
    const score = computeRiskScore({
      fullName: 'Test User',
      dateOfBirth: '1990-01-01',
      nationality: 'KP',
      documentType: 'passport',
      documentNumber: 'XX1234567',
    });
    expect(score).toBeGreaterThanOrEqual(50);
  });
});

describe('Auth endpoints', () => {
  it('rejects weak passwords', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('prevents duplicate registration', async () => {
    await request(app).post('/api/auth/register').send({ email: 'dup@x.com', password: 'longenough123' });
    const dup = await request(app).post('/api/auth/register').send({ email: 'dup@x.com', password: 'longenough123' });
    expect(dup.status).toBe(409);
  });

  it('logs in with valid credentials', async () => {
    await request(app).post('/api/auth/register').send({ email: 'l@x.com', password: 'longenough123' });
    const res = await request(app).post('/api/auth/login').send({ email: 'l@x.com', password: 'longenough123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});

describe('KYC flow', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/kyc/profile').send({});
    expect(res.status).toBe(401);
  });

  it('auto-approves low-risk submissions', async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .post('/api/kyc/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Jane Doe',
        dateOfBirth: '1992-06-15',
        nationality: 'NL',
        documentType: 'passport',
        documentNumber: 'NL12345678',
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('approved');
  });

  it('auto-rejects very high-risk submissions', async () => {
    const token = await registerAndLogin('hr@x.com');
    const res = await request(app)
      .post('/api/kyc/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Kid User',
        dateOfBirth: '2022-01-01',
        nationality: 'KP',
        documentType: 'driver_license',
        documentNumber: 'X123',
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('rejected');
    expect(res.body.rejectionReason).toBeDefined();
  });

  it('returns own profile via /me', async () => {
    const token = await registerAndLogin('me@x.com');
    await request(app)
      .post('/api/kyc/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Jane Doe',
        dateOfBirth: '1992-06-15',
        nationality: 'NL',
        documentType: 'passport',
        documentNumber: 'NL12345678',
      });
    const me = await request(app).get('/api/kyc/profile/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.fullName).toBe('Jane Doe');
  });
});
