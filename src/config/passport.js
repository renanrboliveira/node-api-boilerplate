import { Strategy, ExtractJwt } from 'passport-jwt';
import { jwtSecret } from './vars';
import User from '../api/models/user.model';

const options = {
  secretOrKey: jwtSecret,
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Bearer'),
};

async function verify(payload, done) {
  try {
    const user = await User.findById(payload.sub);
    if (user) return done(null, user);
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
}

module.exports = new Strategy(options, verify);
