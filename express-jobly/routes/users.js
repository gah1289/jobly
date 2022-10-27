'use strict';

/** Routes for users. */

const jsonschema = require('jsonschema');

const express = require('express');
const { ensureLoggedIn, ensureAdmin, ensureAdminOrUser } = require('../middleware/auth');
const { BadRequestError, UnauthorizedError } = require('../expressError');
const User = require('../models/user');
const { createToken } = require('../helpers/tokens');
const userNewSchema = require('../schemas/userNew.json');
const userUpdateSchema = require('../schemas/userUpdate.json');
const Job = require('../models/job');

const router = express.Router();

/** POST / { user }  => { user, token }
 *
 * Adds a new user. This is not the registration endpoint --- instead, this is
 * only for admin users to add new users. The new user being added can be an
 * admin.
 *
 * This returns the newly created user and an authentication token for them:
 *  {user: { username, firstName, lastName, email, isAdmin }, token }
 *
 * Authorization required: login
 **/

router.post('/', ensureLoggedIn, ensureAdmin, async function(req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, userNewSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		const user = await User.register(req.body);
		const token = createToken(user);
		return res.status(201).json({ user, token });
	} catch (err) {
		return next(err);
	}
});

// Allows a user or an admin to apply to a job.
// Should throw an error if the user does not exist, job does not exist.

// Returns {applied: jobId}

router.post('/:username/jobs/:id', ensureLoggedIn, ensureAdminOrUser, async function(req, res, next) {
	try {
		const userData = await User.get(req.params.username);
		const username = userData.username;
		const jobData = await Job.get(req.params.id);
		const jobId = jobData.id;
		const application = await User.apply(username, jobId);
		return res.status(201).json(application);
	} catch (err) {
		return next(err);
	}
});

/** GET / => { users: [ {username, firstName, lastName, email }, ... ] }
 *
 * Returns list of all users.
 *
 * Authorization required: login
 **/

router.get('/', ensureLoggedIn, ensureAdmin, async function(req, res, next) {
	try {
		const users = await User.findAll();
		return res.json({ users });
	} catch (err) {
		return next(err);
	}
});

/** GET /[username] => { user }
 *
 * Returns { username, firstName, lastName, isAdmin }
 *
 * Authorization required: login
 **/

router.get('/:username', ensureLoggedIn, ensureAdminOrUser, async function(req, res, next) {
	try {
		const user = await User.get(req.params.username);
		return res.json({ user });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /[username] { user } => { user }
 *
 * Data can include:
 *   { firstName, lastName, password, email }
 *
 * Returns { username, firstName, lastName, email, isAdmin }
 *
 * Authorization required: login
 **/

router.patch('/:username', ensureLoggedIn, ensureAdminOrUser, async function(req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, userUpdateSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		const user = await User.update(req.params.username, req.body);
		return res.json({ user });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /[username]  =>  { deleted: username }
 *
 * Authorization required: login
 **/

router.delete('/:username', ensureLoggedIn, ensureAdminOrUser, async function(req, res, next) {
	try {
		await User.remove(req.params.username);
		return res.json({ deleted: req.params.username });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
