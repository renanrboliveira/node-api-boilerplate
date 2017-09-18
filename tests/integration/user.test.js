/* eslint-disable arrow-body-style */
/* eslint-disable no-unused-expressions */
import request from 'supertest';
import httpStatus from 'http-status';
import { expect } from 'chai';
import sinon from 'sinon';
import { some, omitBy, isNil } from 'lodash';
import app from '../../src/index';
import User from '../../src/api/models/user.model';
import { jwtExpirationInterval as JWT_EXPIRATION } from '../../src/config/vars';

/**
 * root level hooks
 */

function format(user) {
  const formated = user;

  // delete password
  delete formated.password;
  let userFind;
  // get users from database
  User.findOne({ email: user.email })
    .then((dbUser) => {
      userFind = omitBy(dbUser, isNil);
    });

  return userFind;
}

describe('Users API', () => {
  let adminAccessToken;
  let userAccessToken;
  let dbUsers;
  let user;
  let admin;

  beforeEach(async () => {
    dbUsers = {
      branStark: {
        email: 'branstark@gmail.com',
        password: 'mypassword',
        name: 'Bran Stark',
        role: 'admin',
      },
      jonSnow: {
        email: 'jonsnow@gmail.com',
        password: '123456',
        name: 'Jon Snow',
      },
    };

    user = {
      email: 'ren4n.oliveir4@gmail.com',
      password: '123456',
      name: 'Renan Oliveira',
    };

    admin = {
      email: 'ren4n.oliveir4@gmail.com',
      password: '123456',
      name: 'Renan Oliveira',
      role: 'admin',
    };

    await User.remove({});
    await User.insertMany([dbUsers.branStark, dbUsers.jonSnow]);
    adminAccessToken = (await User.findAndGenerateToken(dbUsers.branStark)).accessToken;
    userAccessToken = (await User.findAndGenerateToken(dbUsers.jonSnow)).accessToken;
  });

  describe('POST /v1/users', () => {
    it('should create a new user when request is ok', (done) => {
      request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(admin)
        .expect(httpStatus.CREATED)
        .then((res) => {
          delete admin.password;
          expect(res.body).to.include(admin);
          done();
        });
    });

    it('should create a new user and set default role to "user"', (done) => {
      request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(user)
        .expect(httpStatus.CREATED)
        .then((res) => {
          expect(res.body.role).to.be.equal('user');
          done();
        });
    });

    it('should report error when email already exists', (done) => {
      user.email = dbUsers.branStark.email;

      request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(user)
        .expect(httpStatus.CONFLICT)
        .then((res) => {
          const field = res.body.errors[0].field;
          const location = res.body.errors[0].location;
          const messages = res.body.errors[0].messages;
          expect(field).to.be.equal('email');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"email" already exists');
          done();
        });
    });

    it('should report error when email is not provided', (done) => {
      delete user.email;

      request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(user)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const field = res.body.errors[0].field[0];
          const location = res.body.errors[0].location;
          const messages = res.body.errors[0].messages;
          expect(field).to.be.equal('email');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"email" is required');
          done();
        });
    });

    it('should report error when password length is less than 6', (done) => {
      user.password = '12345';

      request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(user)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const field = res.body.errors[0].field[0];
          const location = res.body.errors[0].location;
          const messages = res.body.errors[0].messages;
          expect(field).to.be.equal('password');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"password" length must be at least 6 characters long');
          done();
        });
    });

    it('should report error when logged user is not an admin', (done) => {
      request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(user)
        .expect(httpStatus.FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(httpStatus.FORBIDDEN);
          expect(res.body.message).to.be.equal('Forbidden');
          done();
        });
    });
  });

  describe('GET /v1/users', () => {
    it('should get all users', (done) => {
      request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK)
        .then((res) => {
          const bran = format(dbUsers.branStark);
          const john = format(dbUsers.jonSnow);

          const includesBranStark = some(res.body, bran);
          const includesjonSnow = some(res.body, john);

          // before comparing it is necessary to convert String to Date
          res.body[0].createdAt = new Date(res.body[0].createdAt);
          res.body[1].createdAt = new Date(res.body[1].createdAt);
          expect(res.body).to.be.an('array');
          expect(res.body).to.have.lengthOf(2);
          expect(includesBranStark).to.be.true;
          expect(includesjonSnow).to.be.true;
          done();
        });
    });

    it('should get all users with pagination', (done) => {
      request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ page: 2, perPage: 1 })
        .expect(httpStatus.OK)
        .then((res) => {
          delete dbUsers.jonSnow.password;
          const john = format(dbUsers.jonSnow);
          const includesjonSnow = some(res.body, john);

          // before comparing it is necessary to convert String to Date
          res.body[0].createdAt = new Date(res.body[0].createdAt);

          expect(res.body).to.be.an('array');
          expect(res.body).to.have.lengthOf(1);
          expect(includesjonSnow).to.be.true;
          done();
        });
    });

    it('should filter users', (done) => {
      request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ email: dbUsers.jonSnow.email })
        .expect(httpStatus.OK)
        .then((res) => {
          delete dbUsers.jonSnow.password;
          const john = format(dbUsers.jonSnow);
          const includesjonSnow = some(res.body, john);

          // before comparing it is necessary to convert String to Date
          res.body[0].createdAt = new Date(res.body[0].createdAt);

          expect(res.body).to.be.an('array');
          expect(res.body).to.have.lengthOf(1);
          expect(includesjonSnow).to.be.true;
          done();
        });
    });

    it('should report error when pagination\'s parameters are not a number', (done) => {
      request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ page: '?', perPage: 'whaat' })
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const field = res.body.errors[0].field[0];
          const location = res.body.errors[0].location;
          const messages = res.body.errors[0].messages;
          expect(field).to.be.equal('page');
          expect(location).to.be.equal('query');
          expect(messages).to.include('"page" must be a number');
          return Promise.resolve(res);
        })
        .then((res) => {
          const field = res.body.errors[1].field[0];
          const location = res.body.errors[1].location;
          const messages = res.body.errors[1].messages;
          expect(field).to.be.equal('perPage');
          expect(location).to.be.equal('query');
          expect(messages).to.include('"perPage" must be a number');
          done();
        });
    });

    it('should report error if logged user is not an admin', (done) => {
      request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(httpStatus.FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(httpStatus.FORBIDDEN);
          expect(res.body.message).to.be.equal('Forbidden');
          done();
        });
    });
  });

  describe('GET /v1/users/:userId', () => {
    it('should get user', (done) => {
      console.log(adminAccessToken)
      User.findOne({})
        .then((userBs) => {
          delete dbUsers.branStark.password;
          request(app)
            .get(`/v1/users/${userBs._id}`)
            .set('Authorization', `Bearer ${adminAccessToken}`)
            .expect(httpStatus.OK)
            .then((res) => {
              expect(res.body).to.include(dbUsers.branStark);
              done();
            });
        });
    });

    it('should report error "User does not exist" when user does not exists', (done) => {
      request(app)
        .get('/v1/users/56c787ccc67fc16ccc1a5e92')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.be.equal('User does not exist');
          done();
        });
    });

    it('should report error "User does not exist" when id is not a valid ObjectID', (done) => {
      request(app)
        .get('/v1/users/palmeiras1914')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.equal('User does not exist');
          done();
        });
    });

    it('should report error when logged user is not the same as the requested one', async () => {
      const id = (await User.findOne({ email: dbUsers.branStark.email }))._id;

      return request(app)
        .get(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(httpStatus.FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(httpStatus.FORBIDDEN);
          expect(res.body.message).to.be.equal('Forbidden');
        });
    });
  });

  describe('PUT /v1/users/:userId', () => {
    it('should replace user', async () => {
      delete dbUsers.branStark.password;
      const id = (await User.findOne(dbUsers.branStark))._id;

      return request(app)
        .put(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(user)
        .expect(httpStatus.OK)
        .then((res) => {
          delete user.password;
          expect(res.body).to.include(user);
          expect(res.body.role).to.be.equal('user');
        });
    });

    it('should report error when email is not provided', async () => {
      const id = (await User.findOne({}))._id;
      delete user.email;

      return request(app)
        .put(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(user)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const field = res.body.errors[0].field[0];
          const location = res.body.errors[0].location;
          const messages = res.body.errors[0].messages;
          expect(field).to.be.equal('email');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"email" is required');
        });
    });

    it('should report error user when password length is less than 6', async () => {
      const id = (await User.findOne({}))._id;
      user.password = '12345';

      return request(app)
        .put(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(user)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const field = res.body.errors[0].field[0];
          const location = res.body.errors[0].location;
          const messages = res.body.errors[0].messages;
          expect(field).to.be.equal('password');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"password" length must be at least 6 characters long');
        });
    });

    it('should report error "User does not exist" when user does not exists', (done) => {
      request(app)
        .put('/v1/users/palmeiras1914')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.be.equal('User does not exist');
          done();
        });
    });

    it('should report error when logged user is not the same as the requested one', async () => {
      const id = (await User.findOne({ email: dbUsers.branStark.email }))._id;

      return request(app)
        .put(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(httpStatus.FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(httpStatus.FORBIDDEN);
          expect(res.body.message).to.be.equal('Forbidden');
        });
    });

    it('should not replace the role of the user (not admin)', async () => {
      const id = (await User.findOne({ email: dbUsers.jonSnow.email }))._id;
      const role = 'admin';

      return request(app)
        .put(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(admin)
        .expect(httpStatus.OK)
        .then((res) => {
          expect(res.body.role).to.not.be.equal(role);
        });
    });
  });

  describe('PATCH /v1/users/:userId', () => {
    it('should update user', async () => {
      delete dbUsers.branStark.password;
      const id = (await User.findOne(dbUsers.branStark))._id;
      const name = user.name;

      return request(app)
        .patch(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ name })
        .expect(httpStatus.OK)
        .then((res) => {
          expect(res.body.name).to.be.equal(name);
          expect(res.body.email).to.be.equal(dbUsers.branStark.email);
        });
    });

    it('should not update user when no parameters were given', async () => {
      delete dbUsers.branStark.password;
      const id = (await User.findOne(dbUsers.branStark))._id;

      return request(app)
        .patch(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.OK)
        .then((res) => {
          expect(res.body).to.include(dbUsers.branStark);
        });
    });

    it('should report error "User does not exist" when user does not exists', (done) => {
      request(app)
        .patch('/v1/users/palmeiras1914')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.be.equal('User does not exist');
          done();
        });
    });

    it('should report error when logged user is not the same as the requested one', async () => {
      const id = (await User.findOne({ email: dbUsers.branStark.email }))._id;

      return request(app)
        .patch(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(httpStatus.FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(httpStatus.FORBIDDEN);
          expect(res.body.message).to.be.equal('Forbidden');
        });
    });

    it('should not update the role of the user (not admin)', async () => {
      const id = (await User.findOne({ email: dbUsers.jonSnow.email }))._id;
      const role = 'admin';

      return request(app)
        .patch(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ role })
        .expect(httpStatus.OK)
        .then((res) => {
          expect(res.body.role).to.not.be.equal(role);
        });
    });
  });

  describe('DELETE /v1/users', () => {
    it('should delete user', async () => {
      const id = (await User.findOne({}))._id;

      return request(app)
        .delete(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NO_CONTENT)
        .then(() => request(app).get('/v1/users'))
        .then(async () => {
          const users = await User.find({});
          expect(users).to.have.lengthOf(1);
        });
    });

    it('should report error "User does not exist" when user does not exists', (done) => {
      request(app)
        .delete('/v1/users/palmeiras1914')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.be.equal('User does not exist');
          done();
        });
    });

    it('should report error when logged user is not the same as the requested one', async () => {
      const id = (await User.findOne({ email: dbUsers.branStark.email }))._id;

      return request(app)
        .delete(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(httpStatus.FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(httpStatus.FORBIDDEN);
          expect(res.body.message).to.be.equal('Forbidden');
        });
    });
  });

  describe('GET /v1/users/profile', () => {
    it('should get the logged user\'s info', (done) => {
      delete dbUsers.jonSnow.password;

      request(app)
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(httpStatus.OK)
        .then((res) => {
          expect(res.body).to.include(dbUsers.jonSnow);
          done();
        });
    });

    it('should report error without stacktrace when accessToken is expired', async () => {
      // fake time
      const clock = sinon.useFakeTimers();
      const expiredAccessToken = (await User.findAndGenerateToken(dbUsers.branStark)).accessToken;

      // move clock forward by minutes set in config + 1 minute
      clock.tick((JWT_EXPIRATION * 60000) + 60000);

      return request(app)
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${expiredAccessToken}`)
        .expect(httpStatus.UNAUTHORIZED)
        .then((res) => {
          expect(res.body.code).to.be.equal(httpStatus.UNAUTHORIZED);
          expect(res.body.message).to.be.equal('jwt expired');
          expect(res.body).to.not.have.a.property('stack');
        });
    });
  });
});
