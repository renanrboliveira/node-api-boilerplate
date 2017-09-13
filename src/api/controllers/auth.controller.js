import httpStatus from 'http-status';
import moment from 'moment-timezone';
import RefreshToken from '../models/refreshToken.model';
import { jwtExpirationInterval } from '../../config/vars';
import User from '../models/user.model';

/**
* Returns a formated object with tokens
* @private
*/
function generateTokenResponse(user, accessToken) {
  const tokenType = 'Bearer';
  const refreshToken = RefreshToken.generate(user).token;
  const expiresIn = moment().add(jwtExpirationInterval, 'minutes');
  return { tokenType, accessToken, refreshToken, expiresIn };
}

/**
 * Returns jwt token if registration was successful
 * @public
 */
const register = async (req, res, next) => {
  User(req.body)
    .save()
    .then((user) => {
      const userTransformed = user.transform();
      const token = generateTokenResponse(user, user.token());
      res.status(httpStatus.CREATED);
      return res.json({ token, user: userTransformed });
    })
    .catch((error) => {
      next(User.checkDuplicateEmail(error))
    });
};

/**
 * Returns jwt token if valid username and password is provided
 * @public
 */
const login = async (req, res, next) => {
  try {
    const { user, accessToken } = await User.findAndGenerateToken(req.body);
    const token = generateTokenResponse(user, accessToken);
    const userTransformed = user.transform();
    return res.json({ token, user: userTransformed });
  } catch (error) {
    return next(error);
  }
};

/**
 * Returns a new jwt when given a valid refresh token
 * @public
 */
const refresh = async (req, res, next) => {
  try {
    const { email, refreshToken } = req.body;
    const refreshObject = await RefreshToken.findOneAndRemove({
      userEmail: email,
      token: refreshToken,
    });
    const { user, accessToken } = await User.findAndGenerateToken({ email, refreshObject });
    const response = generateTokenResponse(user, accessToken);
    return res.json(response);
  } catch (error) {
    return next(error);
  }
};

export { register, login, refresh };
