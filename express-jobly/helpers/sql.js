const { BadRequestError } = require('../expressError');

// Accepts data in a JS object format and converts it into SQL query to update the db.
// Sanitizes the query to avoid SQL injection from unwanted sources.
// Provides an object with set columns with their sanitized code numbers and respective values.
// {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
	const keys = Object.keys(dataToUpdate);
	if (keys.length === 0) throw new BadRequestError('No data');

	const cols = keys.map((colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`);

	return {
		setCols : cols.join(', '),
		values  : Object.values(dataToUpdate)
	};
}

module.exports = { sqlForPartialUpdate };
