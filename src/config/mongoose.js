import mongoose from 'mongoose';
import { mongo, env } from './vars';

// set mongoose native Promise
mongoose.Promise = global.Promise; // require('bluebird');

// Exit application on error
mongoose.connection.on('error', (err) => {
  console.error(`MongoDB connection error: ${err}`);
  process.exit(-1);
});

// print mongoose logs in dev env
if (env === 'development') {
  mongoose.set('debug', true);
}

/**
* Connect to mongo db
*
* @returns {object} Mongoose connection
* @public
*/
const connect = () => mongoose.connect(mongo.uri, {
  keepAlive: 1,
  useMongoClient: true,
});

export default { connect };
