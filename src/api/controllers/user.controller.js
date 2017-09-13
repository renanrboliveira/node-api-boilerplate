import httpStatus from 'http-status';
import { omit } from 'lodash';
import User from '../models/user.model';
import { handler as errorHandler } from '../middlewares/error';

/**
 * Load user and append to req.
 * @public
 */
const load = async (req, res, next, id) => {
  try {
    const user = await User.get(id);
    req.locals = { user };
    return next();
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

/**
 * Get user
 * @public
 */
const get = (req, res) => res.json(req.locals.user.transform());

/**
 * Get logged in user info
 * @public
 */
const loggedIn = (req, res) => res.json(req.user.transform());

/**
 * Create new user
 * @public
 */
const create = async (req, res, next) => {
  try {
    const user = new User(req.body);
    const savedUser = await user.save();
    res.status(httpStatus.CREATED);
    res.json(savedUser.transform());
  } catch (error) {
    next(User.checkDuplicateEmail(error));
  }
};

/**
 * Replace existing user
 * @public
 */
const replace = async (req, res, next) => {
  try {
    const { user } = req.locals;
    const newUser = new User(req.body);
    const ommitRole = user.role !== 'admin' ? 'role' : '';
    const newUserObject = omit(newUser.toObject(), '_id', ommitRole);

    await user.update(newUserObject, { override: true, upsert: true });
    const savedUser = await User.findById(user._id);

    res.json(savedUser.transform());
  } catch (error) {
    next(User.checkDuplicateEmail(error));
  }
};

/**
 * Update existing user
 * @public
 */
const update = (req, res, next) => {
  const ommitRole = req.locals.user.role !== 'admin' ? 'role' : '';
  const updatedUser = omit(req.body, ommitRole);
  const user = Object.assign(req.locals.user, updatedUser);

  user.save()
    .then(savedUser => res.json(savedUser.transform()))
    .catch(e => next(User.checkDuplicateEmail(e)));
};

/**
 * Get user list
 * @public
 */
const list = (req, res, next) => {
  User.list(req.query)
    .then((users) => {
      const transformedUsers = users.map(user => user.transform());
      res.json(transformedUsers);
    })
    .catch((error) => {
      next(error);
    });
};

/**
 * Delete user
 * @public
 */
const remove = (req, res, next) => {
  const user = req.locals.user;

  user.remove()
    .then(() => res.status(httpStatus.NO_CONTENT).end())
    .catch(e => next(e));
};

export { load, get, loggedIn, create, replace, update, list, remove };
