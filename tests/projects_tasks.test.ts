import request from 'supertest'
import app from '../src/index'
import { describe, it, expect } from 'vitest'

describe('Projects & Tasks API', () => {
  async function registerAndLogin() {
    const email = `user${Math.random().toString(36).slice(2)}@example.com`
    const password = 'pass12345'
    const name = 'User'
    const reg = await request(app).post('/auth/register').send({ email, password, name })
    const token = reg.body.token as string
    return { token }
  }

  it('can create a project and a task, then update and delete task', async () => {
    const { token } = await registerAndLogin()

    const proj = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'My Project', description: 'desc' })
    expect(proj.status).toBe(201)
    const projectId = proj.body.id as string

    const task = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Task A', projectId, status: 'todo', priority: 'medium' })
    expect(task.status).toBe(201)
    const taskId = task.body.id as string

    const patch = await request(app)
      .patch(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'done' })
    expect(patch.status).toBe(200)
    expect(patch.body.status).toBe('done')

    const del = await request(app)
      .delete(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(del.status).toBe(200)
  })
})
