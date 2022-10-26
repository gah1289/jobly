'use strict';

const db = require('../db');
const { BadRequestError, NotFoundError, ExpressError } = require('../expressError');
const { sqlForPartialUpdate } = require('../helpers/sql');

/** Related functions for jobs. */

class Job {
	/** Create a job (from data), update db, return new job data.
   *
   * data should be {title, salary, equity, company_handle AS "companyHandle" }
   *
   * Returns { id, title, salary, equity, company_handle AS "companyHandle" }
   *
   * Throws BadRequestError if company already in database.
   * */

	static async create({ title, salary, equity, companyHandle }) {
		const companyExists = await db.query(
			`SELECT handle
		   FROM companies
		   WHERE handle = $1`,
			[
				companyHandle
			]
		);

		if (!companyExists.rows[0]) throw new BadRequestError(`Company does not exist: ${companyHandle}`);

		const result = await db.query(
			`INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
			[
				title,
				salary,
				equity,
				companyHandle
			]
		);
		const job = result.rows[0];

		return job;
	}

	/** Find all jobs.
   *
   * Returns [{ id, title, salary, equity, company_handle }, ...]
   * */

	static async findAll() {
		const jobs = await db.query(
			`SELECT id,
	              title,
	              salary,
	             equity,
	              company_handle AS "companyHandle"
	       FROM jobs
	       `
		);
		return jobs.rows;
	}

	/** Given a job id, return data about job.
   *
   * Returns { title, salary, equity, company_handle AS "companyHandle" }

   *
   * Throws NotFoundError if not found.
   **/

	static async get(id) {
		const jobRes = await db.query(
			`SELECT id,
            title,
            salary,
           equity,
            company_handle AS "companyHandle"
     FROM jobs
	       WHERE id = $1`,
			[
				id
			]
		);

		const job = jobRes.rows[0];

		if (!job) throw new NotFoundError(`No job with id: ${id}`);

		return job;
	}

	/** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, and equity}
   *
   * Returns {title, salary, equity, company_handle AS "companyHandle"}
   *
   * Throws NotFoundError if not found.
   */

	static async update(id, data) {
		const { setCols, values } = sqlForPartialUpdate(data, {
			companyHandle : 'company_handle'
		});

		const querySql = `UPDATE jobs
	                  SET ${setCols}
	                  WHERE id = ${id}
	                  RETURNING id, title,
	                            salary,
	                            equity,
	                            company_handle AS "companyHandle"
	                            `;
		const result = await db.query(querySql, [
			...values
		]);
		const job = result.rows[0];

		if (!job) throw new NotFoundError(`No job with id: ${id}`);

		return job;
	}

	/** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

	static async remove(id) {
		const result = await db.query(
			`DELETE
	       FROM jobs
	       WHERE id = $1
	       RETURNING id`,
			[
				id
			]
		);
		const job = result.rows[0];

		if (!job) throw new NotFoundError(`No job with id: ${id}`);
	}

	// Filters jobs by title, salary whether or not they have equity.

	static async filter(reqBody) {
		const query = `SELECT id,
        title,
        salary,
       equity,
        company_handle AS "companyHandle"
 FROM jobs
	`;
		let whereExpressions = [];

		if ('title' in reqBody) {
			let reqTitle = reqBody.title;
			if (whereExpressions.length == 0) {
				whereExpressions.push(`WHERE title LIKE '%${reqTitle}%'`);
			}
			else {
				whereExpressions.push(`AND name LIKE '%${reqTitle}%'`);
			}
		}

		if ('minSalary' in reqBody) {
			let minSalary = reqBody.minSalary;
			if (whereExpressions.length == 0) {
				whereExpressions.push(`WHERE salary >= ${minSalary}`);
			}
			else {
				whereExpressions.push(`AND salary >= ${minSalary}`);
			}
		}
		if ('hasEquity' in reqBody) {
			let hasEquity = reqBody.hasEquity;
			if (hasEquity) {
				if (whereExpressions.length == 0) {
					whereExpressions.push(`WHERE equity>0`);
				}
				else {
					whereExpressions.push(`AND equity>0`);
				}
			}
		}

		// for (let key in reqBody) {
		// 	if (key !== 'title' || key !== 'minSalary' || key !== 'hasEquity') {
		// 		console.log(key);
		// 		throw new BadRequestError(`Cannot filter by ${key}`);
		// 	}
		// }

		const newQuery = query + whereExpressions.join(' ');

		const jobRes = await db.query(newQuery);

		return jobRes.rows;
	}
}

module.exports = Job;
