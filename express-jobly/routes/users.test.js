'use strict';

const request = require('supertest');

const db = require('../db.js');
const app = require('../app');
const User = require('../models/user');
const { createToken } = require('../helpers/tokens.js');

const { commonBeforeAll, commonBeforeEach, commonAfterEach, commonAfterAll, u1Token } = require('./_testCommon');

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /users */

describe('POST /users', function() {
	test('works for users: create non-admin', async function() {
		await User.update('u3', { isAdmin: true });
		const adminToken = createToken({ username: 'u3', isAdmin: true });
		const resp = await request(app)
			.post('/users')
			.send({
				username  : 'u-new',
				firstName : 'First-new',
				lastName  : 'Last-new',
				password  : 'password-new',
				email     : 'new@email.com',
				isAdmin   : false
			})
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(201);
		expect(resp.body).toEqual({
			user  : {
				username  : 'u-new',
				firstName : 'First-new',
				lastName  : 'Last-new',
				email     : 'new@email.com',
				isAdmin   : false
			},
			token : expect.any(String)
		});
	});

	test('works for users: create admin', async function() {
		await User.update('u1', { isAdmin: true });
		const adminToken = createToken({ username: 'u1', isAdmin: true });
		const resp = await request(app)
			.post('/users')
			.send({
				username  : 'u-new',
				firstName : 'First-new',
				lastName  : 'Last-new',
				password  : 'password-new',
				email     : 'new@email.com',
				isAdmin   : true
			})
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(201);
		expect(resp.body).toEqual({
			user  : {
				username  : 'u-new',
				firstName : 'First-new',
				lastName  : 'Last-new',
				email     : 'new@email.com',
				isAdmin   : true
			},
			token : expect.any(String)
		});
	});

	test('unauth for anon', async function() {
		const resp = await request(app).post('/users').send({
			username  : 'u-new',
			firstName : 'First-new',
			lastName  : 'Last-new',
			password  : 'password-new',
			email     : 'new@email.com',
			isAdmin   : true
		});
		expect(resp.statusCode).toEqual(401);
	});

	test('bad request if missing data', async function() {
		await User.update('u3', { isAdmin: true });
		const adminToken = createToken({ username: 'u3', isAdmin: true });
		const resp = await request(app)
			.post('/users')
			.send({
				username : 'u-new'
			})
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(400);
	});

	test('bad request if invalid data', async function() {
		await User.update('u3', { isAdmin: true });
		const adminToken = createToken({ username: 'u3', isAdmin: true });
		const resp = await request(app)
			.post('/users')
			.send({
				username  : 'u-new',
				firstName : 'First-new',
				lastName  : 'Last-newL',
				password  : 'password-new',
				email     : 'not-an-email',
				isAdmin   : true
			})
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(400);
	});
});

/************************************** GET /users */

describe('GET /users', function() {
	test('works for admin', async function() {
		await User.update('u3', { isAdmin: true });
		const adminToken = createToken({ username: 'u3', isAdmin: true });
		const resp = await request(app).get('/users').set('authorization', `Bearer ${adminToken}`);
		expect(resp.body).toEqual({
			users : [
				{
					username  : 'u1',
					firstName : 'U1F',
					lastName  : 'U1L',
					email     : 'u1@email.com',
					isAdmin   : false
				},
				{
					username  : 'u2',
					firstName : 'U2F',
					lastName  : 'U2L',
					email     : 'u2@email.com',
					isAdmin   : false
				},
				{
					username  : 'u3',
					firstName : 'U3F',
					lastName  : 'U3L',
					email     : 'u3@email.com',
					isAdmin   : true
				}
			]
		});
	});

	test('unauth for anon', async function() {
		const resp = await request(app).get('/users');
		expect(resp.statusCode).toEqual(401);
	});

	test('unauth for nonadmins', async function() {
		const resp = await request(app).get('/users').set('authorization', `Bearer ${u1Token}`);
		expect(resp.statusCode).toEqual(401);
	});

	test('fails: test next() handler', async function() {
		// there's no normal failure event which will cause this route to fail ---
		// thus making it hard to test that the error-handler works with it. This
		// should cause an error, all right :)
		await db.query('DROP TABLE users CASCADE');
		const resp = await request(app).get('/users');
		expect(resp.statusCode).toEqual(401);
	});
});

/************************************** GET /users/:username */

describe('GET /users/:username', function() {
	test('works for users', async function() {
		const resp = await request(app).get(`/users/u1`).set('authorization', `Bearer ${u1Token}`);
		expect(resp.body).toEqual({
			user : {
				username  : 'u1',
				firstName : 'U1F',
				lastName  : 'U1L',
				email     : 'u1@email.com',
				isAdmin   : false
			}
		});
	});

	test('unauth for anon', async function() {
		const resp = await request(app).get(`/users/u1`);
		expect(resp.statusCode).toEqual(401);
	});
});

/************************************** PATCH /users/:username */

describe('PATCH /users/:username', () => {
	test('works for users', async function() {
		const resp = await request(app)
			.patch(`/users/u1`)
			.send({
				firstName : 'New'
			})
			.set('authorization', `Bearer ${u1Token}`);
		expect(resp.body).toEqual({
			user : {
				username  : 'u1',
				firstName : 'New',
				lastName  : 'U1L',
				email     : 'u1@email.com',
				isAdmin   : false
			}
		});
	});

	test('unauth for anon', async function() {
		const resp = await request(app).patch(`/users/u1`).send({
			firstName : 'New'
		});
		expect(resp.statusCode).toEqual(401);
	});

	test('bad request if invalid data', async function() {
		const resp = await request(app)
			.patch(`/users/u1`)
			.send({
				firstName : 42
			})
			.set('authorization', `Bearer ${u1Token}`);
		expect(resp.statusCode).toEqual(400);
	});

	test('works: set new password', async function() {
		const resp = await request(app)
			.patch(`/users/u1`)
			.send({
				password : 'new-password'
			})
			.set('authorization', `Bearer ${u1Token}`);
		expect(resp.body).toEqual({
			user : {
				username  : 'u1',
				firstName : 'U1F',
				lastName  : 'U1L',
				email     : 'u1@email.com',
				isAdmin   : false
			}
		});
		const isSuccessful = await User.authenticate('u1', 'new-password');
		expect(isSuccessful).toBeTruthy();
	});
});

/************************************** DELETE /users/:username */

describe('DELETE /users/:username', function() {
	test('works for users', async function() {
		const resp = await request(app).delete(`/users/u1`).set('authorization', `Bearer ${u1Token}`);
		expect(resp.body).toEqual({ deleted: 'u1' });
	});

	test('unauth for anon', async function() {
		const resp = await request(app).delete(`/users/u1`);
		expect(resp.statusCode).toEqual(401);
	});
});

describe('POST /users/:username/jobs/:id', function() {
	test('user or admin can apply to job', async function() {
		const insertJob = await db.query(`INSERT INTO jobs (title, salary, equity, company_handle)
      VALUES ('testJob', 50000, 0.1, 'c2'), ('testJob2', 60000, NULL, 'c3' ) RETURNING *`);
		const jobId = insertJob.rows[0].id;
		const resp = await request(app).post(`/users/u1/jobs/${jobId}`).set('authorization', `Bearer ${u1Token}`);
		expect(resp.statusCode).toEqual(201);
	});

	test('unauth for anon', async function() {
		const resp = await request(app).delete(`/users/u1`);
		expect(resp.statusCode).toEqual(401);
	});
});
