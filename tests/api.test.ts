import request from 'supertest'
import app from '../src/index'
import { describe, it, expect } from 'vitest'

describe('API', () => {
  it('healthz should return ok', async () => {
    const res = await request(app).get('/healthz')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('register and login should work', async () => {
    const email = `test${Math.random().toString(36).slice(2)}@example.com`
    const password = 'password123'
    const name = 'Tester'

    const reg = await request(app).post('/auth/register').send({ email, password, name })
    expect(reg.status).toBe(201)
    expect(reg.body.token).toBeTruthy()

    const login = await request(app).post('/auth/login').send({ email, password })
    expect(login.status).toBe(200)
    expect(login.body.token).toBeTruthy()
  })
})
