'use strict';

const db = require('../db.js');
const { BadRequestError, NotFoundError } = require('../expressError');
const Job = require('./job.js');
const { commonBeforeAll, commonBeforeEach, commonAfterEach, commonAfterAll } = require('./_testCommon');

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create Job, returns an object {id, title, salary, equity, companyHandle} */

describe('create', function() {
	const newJob = {
		title         : 'test',
		salary        : 100000,
		equity        : 0,
		companyHandle : 'c1'
	};

	const jobWithNoCompany = {
		title         : 'test',
		salary        : 100000,
		equity        : 0,
		companyHandle : 'bad'
	};

	test('works', async function() {
		let job = await Job.create(newJob);
		expect(job.title).toEqual(newJob.title);
		const result = await db.query(
			`SELECT id, title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE id = $1`,
			[
				job.id
			]
		);

		expect(result.rows).toEqual([
			{
				id            : job.id,
				title         : 'test',
				salary        : 100000,
				equity        : '0',
				companyHandle : 'c1'
			}
		]);
	});

	test('company does not exist, return error', async function() {
		try {
			await Job.create(jobWithNoCompany);

			fail();
		} catch (err) {
			expect(err instanceof BadRequestError).toBeTruthy();
		}
	});
});

/************************************** findAll */

describe('findAll', function() {
	test('works: no filter', async function() {
		let jobs = await Job.findAll();
		expect(jobs).toEqual([
			{
				id            : expect.any(Number),
				title         : 'testJob',
				salary        : 50000,
				equity        : '0.1',
				companyHandle : 'c2'
			},
			{
				id            : expect.any(Number),
				title         : 'testJob2',
				salary        : 60000,
				equity        : null,
				companyHandle : 'c3'
			}
		]);
	});
});

// /************************************** get one job by id */

describe('get', function() {
	test('works', async function() {
		let jobData = await db.query(`SELECT id, title, salary, equity, company_handle AS "companyHandle"
        FROM jobs WHERE title='testJob'`);

		let job = await Job.get(jobData.rows[0].id);
		expect(job).toEqual({
			id            : expect.any(Number),
			title         : 'testJob',
			salary        : 50000,
			equity        : '0.1',
			companyHandle : 'c2'
		});
	});

	test('not found if no such id', async function() {
		try {
			await Job.get(0);
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});

// /************************************** update */

describe('update', function() {
	const updateData = {
		title  : 'updatedJob',
		salary : 60000,
		equity : 0.1
	};

	test('works', async function() {
		let jobData = await db.query(`SELECT id, title, salary, equity, company_handle AS "companyHandle"
        FROM jobs WHERE title='testJob'`);

		let job = jobData.rows[0];
		let updatedJob = await Job.update(job.id, updateData);
		expect(updatedJob).toEqual({
			id            : expect.any(Number),
			title         : 'updatedJob',
			salary        : 60000,
			equity        : '0.1',
			companyHandle : 'c2'
		});

		const result = await db.query(
			`SELECT id, title, salary, equity, company_handle AS "companyHandle"
        FROM jobs WHERE id=$1`,
			[
				job.id
			]
		);
		expect(result.rows).toEqual([
			{
				id            : expect.any(Number),
				title         : 'updatedJob',
				salary        : 60000,
				equity        : '0.1',
				companyHandle : 'c2'
			}
		]);
	});

	test('works: null fields', async function() {
		const updateDataSetNulls = {
			title  : 'updatedJob',
			salary : 60000,
			equity : null
		};

		let jobData = await db.query(`SELECT id, title, salary, equity, company_handle AS "companyHandle"
        FROM jobs WHERE title='testJob'`);
		let job = jobData.rows[0];

		let updatedJob = await Job.update(job.id, updateDataSetNulls);
		expect(updatedJob).toEqual({
			id            : expect.any(Number),
			title         : 'updatedJob',
			salary        : 60000,
			equity        : null,
			companyHandle : 'c2'
		});
		const result = await db.query(
			`SELECT id, title, salary, equity, company_handle AS "companyHandle"
        FROM jobs WHERE id=$1`,
			[
				updatedJob.id
			]
		);
		expect(result.rows).toEqual([
			{
				id            : expect.any(Number),
				title         : 'updatedJob',
				salary        : 60000,
				equity        : null,
				companyHandle : 'c2'
			}
		]);
	});

	test('not found if no such job', async function() {
		try {
			await Job.update(0, updateData);
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});

// /************************************** remove */

describe('remove', function() {
	test('works', async function() {
		let jobData = await db.query(`SELECT id, title, salary, equity, company_handle AS "companyHandle"
        FROM jobs WHERE title='testJob'`);

		let job = jobData.rows[0];
		await Job.remove(job.id);
		const res = await db.query('SELECT id FROM jobs WHERE id=$1', [
			job.id
		]);
		expect(res.rows.length).toEqual(0);
	});

	test('not found if no such job', async function() {
		try {
			await Job.remove(0);
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});

// // *************** filter by name and number of employees works

describe('filter', function() {
	test('filter by title works', async function() {
		const reqBody = {
			title : 'testJob'
		};
		let jobs = await Job.filter(reqBody);
		expect(jobs).toEqual([
			{
				id            : expect.any(Number),
				title         : 'testJob',
				salary        : 50000,
				equity        : '0.1',
				companyHandle : 'c2'
			},
			{
				id            : expect.any(Number),
				title         : 'testJob2',
				salary        : 60000,
				equity        : null,
				companyHandle : 'c3'
			}
		]);
	});
	test('filter by minSalary works', async function() {
		const reqBody = {
			minSalary : 55000
		};
		let jobs = await Job.filter(reqBody);
		expect(jobs).toEqual([
			{
				id            : expect.any(Number),
				title         : 'testJob2',
				salary        : 60000,
				equity        : null,
				companyHandle : 'c3'
			}
		]);
	});
	test('filter by hasEquity works', async function() {
		const reqBody = {
			hasEquity : true
		};
		let jobs = await Job.filter(reqBody);

		expect(jobs).toEqual([
			{
				id            : expect.any(Number),
				title         : 'testJob',
				salary        : 50000,
				equity        : '0.1',
				companyHandle : 'c2'
			}
		]);
	});
	test('filter by name, minEmployees, and maxEmployees works', async function() {
		const reqBody = {
			minSalary : 55000,
			hasEquity : false
		};
		let jobs = await Job.filter(reqBody);
		expect(jobs).toEqual([
			{
				id            : expect.any(Number),
				title         : 'testJob2',
				salary        : 60000,
				equity        : null,
				companyHandle : 'c3'
			}
		]);
	});

	// 	test('throw error for bad filter parameter', async function() {
	// 		const reqBody = {
	// 			handle : 'c1'
	// 		};
	// 		let res = await Company.filter(reqBody);
	// 		expect(() => res.toThrow('Cannot filter by handle'));
	// 	});
});
