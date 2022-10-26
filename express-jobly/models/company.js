'use strict';

const db = require('../db');
const { BadRequestError, NotFoundError, ExpressError } = require('../expressError');
const { sqlForPartialUpdate } = require('../helpers/sql');
const { convertToInt } = require('../helpers/filter');

/** Related functions for companies. */

class Company {
	/** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

	static async create({ handle, name, description, numEmployees, logoUrl }) {
		const duplicateCheck = await db.query(
			`SELECT handle
           FROM companies
           WHERE handle = $1`,
			[
				handle
			]
		);

		if (duplicateCheck.rows[0]) throw new BadRequestError(`Duplicate company: ${handle}`);

		const result = await db.query(
			`INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
			[
				handle,
				name,
				description,
				numEmployees,
				logoUrl
			]
		);
		const company = result.rows[0];

		return company;
	}

	/** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

	static async findAll() {
		const companiesRes = await db.query(
			`SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           ORDER BY name`
		);
		return companiesRes.rows;
	}

	/** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

	static async get(handle) {
		const companyRes = await db.query(
			`SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
			[
				handle
			]
		);

		const companyData = companyRes.rows[0];

		if (!companyData) throw new NotFoundError(`No company: ${handle}`);

		const jobRes = await db.query(`SELECT id, title, salary, equity FROM jobs WHERE company_handle=$1`, [
			handle
		]);

		const jobs = jobRes.rows;

		const company = {
			company : companyData,
			jobs
		};

		return company;
	}

	/** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

	static async update(handle, data) {
		const { setCols, values } = sqlForPartialUpdate(data, {
			numEmployees : 'num_employees',
			logoUrl      : 'logo_url'
		});
		const handleVarIdx = '$' + (values.length + 1);

		const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
		const result = await db.query(querySql, [
			...values,
			handle
		]);
		const company = result.rows[0];

		if (!company) throw new NotFoundError(`No company: ${handle}`);

		return company;
	}

	/** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

	static async remove(handle) {
		const result = await db.query(
			`DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
			[
				handle
			]
		);
		const company = result.rows[0];

		if (!company) throw new NotFoundError(`No company: ${handle}`);
	}

	// Filters employees by name, partial name and number of employees.

	static async filter(reqBody) {
		const query = `SELECT handle,
    name,
    description,
    num_employees AS "numEmployees",
    logo_url AS "logoUrl"
    FROM companies 
`;
		let whereExpressions = [];

		if ('name' in reqBody) {
			let reqName = reqBody.name;
			if (whereExpressions.length == 0) {
				whereExpressions.push(`WHERE name LIKE '%${reqName}%'`);
			}
			else {
				whereExpressions.push(`AND name LIKE '%${reqName}%'`);
			}
		}
		if ('minEmployees' in reqBody && 'maxEmployees' in reqBody) {
			let minEmployees = reqBody.minEmployees;
			let maxEmployees = reqBody.maxEmployees;
			if (minEmployees > maxEmployees) {
				throw new BadRequestError('minEmployees cannot be higher than maxEmployees');
			}
		}
		if ('minEmployees' in reqBody) {
			let minEmployees = reqBody.minEmployees;
			if (whereExpressions.length == 0) {
				whereExpressions.push(`WHERE num_employees >= ${minEmployees}`);
			}
			else {
				whereExpressions.push(`AND num_employees >= ${minEmployees}`);
			}
		}
		if ('maxEmployees' in reqBody) {
			let maxEmployees = reqBody.maxEmployees;
			if (whereExpressions.length == 0) {
				whereExpressions.push(`WHERE num_employees <= ${maxEmployees}`);
			}
			else {
				whereExpressions.push(`AND num_employees <= ${maxEmployees}`);
			}
		}

		// for (let key in reqBody) {
		// 	if (key !== 'name' || key !== 'minEmployees' || key !== 'maxEmployees') {
		// 		throw new BadRequestError(`Cannot filter by ${key}`);
		// 	}
		// }

		const newQuery = query + whereExpressions.join(' ');
		console.log(newQuery);
		const companyRes = await db.query(newQuery);

		return companyRes.rows;
	}
}

module.exports = Company;
