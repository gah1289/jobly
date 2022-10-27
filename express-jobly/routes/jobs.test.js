'use strict';

const request = require('supertest');
const User = require('../models/user');
const db = require('../db');
const app = require('../app');
const { createToken } = require('../helpers/tokens.js');
const { commonBeforeAll, commonBeforeEach, commonAfterEach, commonAfterAll, u1Token } = require('./_testCommon');

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe('POST /jobs', function() {
	const newJob = {
		title         : 'newTestJob',
		salary        : 10000,
		equity        : null,
		companyHandle : 'c1'
	};

	test('ok for admin', async function() {
		await User.update('u3', { isAdmin: true });
		const adminToken = createToken({ username: 'u3', isAdmin: true });
		const resp = await request(app).post('/jobs').send(newJob).set('authorization', `Bearer ${adminToken}`);
		console.log(resp);
		expect(resp.statusCode).toEqual(201);
		expect(resp.body).toEqual({
			job : {
				id            : expect.any(Number),
				title         : 'newTestJob',
				salary        : 10000,
				equity        : null,
				companyHandle : 'c1'
			}
		});
	});

	test('bad request with missing data', async function() {
		await User.update('u3', { isAdmin: true });
		const adminToken = createToken({ username: 'u3', isAdmin: true });
		const resp = await request(app)
			.post('/jobs')
			.send({
				title  : 'bad',
				equity : 0
			})
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(400);
	});

	test('bad request with invalid data', async function() {
		await User.update('u3', { isAdmin: true });
		const adminToken = createToken({ username: 'u3', isAdmin: true });
		const resp = await request(app)
			.post('/jobs')
			.send({
				title         : 'newTestJob',
				salary        : '10000',
				equity        : null,
				companyHandle : 'c1'
			})
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(400);
	});
	test('good request, unauthorized user', async function() {
		await User.update('u3', { isAdmin: true });
		const adminToken = createToken({ username: 'u3', isAdmin: true });
		const resp = await request(app).post('/jobs').send(newJob).set('authorization', `Bearer ${u1Token}`);
		expect(resp.statusCode).toEqual(401);
	});
});

/************************************** GET /companies */

describe('GET /jobs', function() {
	test('ok for anon', async function() {
		const resp = await request(app).get('/companies');
		expect(resp.statusCode).toEqual(200);
	});
});

/************************************** GET /companies/:handle */

describe('GET /jobs/:id', function() {
	test('works for anon', async function() {
		const jobData = await db.query(`SELECT id FROM jobs WHERE title='j1'`);
		const jobId = jobData.rows[0].id;
		const resp = await request(app).get(`/jobs/${jobId}`);
		console.log(resp.body);
		expect(resp.body).toEqual({
			job : {
				id            : expect.any(Number),
				title         : 'j1',
				salary        : 10000,
				equity        : '0.1',
				companyHandle : 'c1'
			}
		});
	});

	//
	test('not found for no such job', async function() {
		const resp = await request(app).get(`/jobs/0`);
		expect(resp.statusCode).toEqual(404);
	});
});

// /************************************** PATCH /jobs/:handle */

describe('PATCH /jobs/:id', function() {
	test('works for admin', async function() {
		await User.update('u3', { isAdmin: true });
		const adminToken = createToken({ username: 'u3', isAdmin: true });
		const jobData = await db.query(`SELECT id FROM jobs WHERE title='j1'`);
		const jobId = jobData.rows[0].id;
		const resp = await request(app)
			.patch(`/jobs/${jobId}`)
			.send({
				title         : 'j1-new',
				salary        : 10000,
				equity        : null,
				companyHandle : 'c1'
			})
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.body).toEqual({
			job : {
				id            : expect.any(Number),
				title         : 'j1-new',
				salary        : 10000,
				equity        : null,
				companyHandle : 'c1'
			}
		});
	});

	test('unauth for anon', async function() {
		const jobData = await db.query(`SELECT id FROM jobs WHERE title='j1'`);
		const jobId = jobData.rows[0].id;
		const resp = await request(app).patch(`/jobs/${jobId}`).send({
			title         : 'should not work',
			salary        : 10000,
			equity        : null,
			companyHandle : 'c1'
		});
		expect(resp.statusCode).toEqual(401);
	});

	test('unauth for non-admin', async function() {
		const jobData = await db.query(`SELECT id FROM jobs WHERE title='j1'`);
		const jobId = jobData.rows[0].id;
		const resp = await request(app)
			.patch(`/jobs/${jobId}`)
			.send({
				title         : 'should not work',
				salary        : 10000,
				equity        : null,
				companyHandle : 'c1'
			})
			.set('authorization', `Bearer ${u1Token}`);
		expect(resp.statusCode).toEqual(401);
	});

	test('not found on no such company', async function() {
		await User.update('u3', { isAdmin: true });
		const adminToken = createToken({ username: 'u3', isAdmin: true });
		const resp = await request(app)
			.patch(`/jobs/0`)
			.send({
				title         : 'should not work',
				salary        : 10000,
				equity        : null,
				companyHandle : 'c1'
			})
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(404);
	});

	test('bad request on id change attempt', async function() {
		await User.update('u3', { isAdmin: true });
		const adminToken = createToken({ username: 'u3', isAdmin: true });
		const jobData = await db.query(`SELECT id FROM jobs WHERE title='j1'`);
		const jobId = jobData.rows[0].id;
		const resp = await request(app)
			.patch(`/jobs/${jobId}`)
			.send({
				id : 2
			})
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(400);
	});

	test('bad request on invalid data', async function() {
		await User.update('u3', { isAdmin: true });
		const adminToken = createToken({ username: 'u3', isAdmin: true });
		const jobData = await db.query(`SELECT id FROM jobs WHERE title='j1'`);
		const jobId = jobData.rows[0].id;
		const resp = await request(app)
			.patch(`/jobs/${jobId}`)
			.send({
				title         : 'j1-new',
				salary        : '10000',
				equity        : 'null',
				companyHandle : 'c1'
			})
			.set('authorization', `Bearer ${adminToken}`);
		console.log('RESP---->', resp);
		expect(resp.statusCode).toEqual(400);
	});
});

// /************************************** DELETE /companies/:handle */

describe('DELETE /jobs/:id', function() {
	test('works for admin', async function() {
		await User.update('u3', { isAdmin: true });
		const adminToken = createToken({ username: 'u3', isAdmin: true });
		const jobData = await db.query(`SELECT id FROM jobs WHERE title='j1'`);
		const jobId = jobData.rows[0].id;
		const resp = await request(app).delete(`/jobs/${jobId}`).set('authorization', `Bearer ${adminToken}`);
		expect(resp.body).toEqual({ deleted: `${jobId}` });
	});

	test('unauth for anon', async function() {
		const jobData = await db.query(`SELECT id FROM jobs WHERE title='j1'`);
		const jobId = jobData.rows[0].id;
		const resp = await request(app).delete(`/jobs/${jobId}`);
		expect(resp.statusCode).toEqual(401);
	});

	test('unauth for non-admin', async function() {
		const jobData = await db.query(`SELECT id FROM jobs WHERE title='j1'`);
		const jobId = jobData.rows[0].id;
		const resp = await request(app).delete(`/jobs/${jobId}`).set('authorization', `Bearer ${u1Token}`);
		expect(resp.statusCode).toEqual(401);
	});
});
