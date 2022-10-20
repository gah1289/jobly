const jwt = require('jsonwebtoken');
const { sqlForPartialUpdate } = require('./sql');
const { SECRET_KEY } = require('../config');
const { BadRequestError } = require('../expressError');

describe('sqlForPartialUpdate', function() {
	test('works', function() {
		const data = { firstName: 'Aliya', lastName: 'McCarthy', isAdmin: true };
		const jsToSql = {
			firstName : 'first_name',
			lastName  : 'last_name',
			isAdmin   : 'is_admin'
		};
		const converted = sqlForPartialUpdate(data, jsToSql);
		expect(converted).toEqual({
			setCols : '"first_name"=$1, "last_name"=$2, "is_admin"=$3',
			values  : [
				'Aliya',
				'McCarthy',
				true
			]
		});
	});

	test('Throws error for bad data', function() {
		const data = {};
		const jsToSql = {
			firstName : 'first_name',
			lastName  : 'last_name',
			isAdmin   : 'is_admin'
		};
		expect(() => sqlForPartialUpdate(data, jsToSql)).toThrow('No data');

		// https://stackoverflow.com/questions/46042613/how-to-test-the-type-of-a-thrown-exception-in-jest
	});
});
