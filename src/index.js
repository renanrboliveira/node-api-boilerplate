import { port, env } from './config/vars';
import app from './config/express';
import mongoose from './config/mongoose';

// make bluebird default Promise
Promise = require('bluebird'); // eslint-disable-line no-global-assign

// open mongoose connection
mongoose.connect();

// listen to requests
app.listen(port, () => console.info(`server started on port ${port} (${env})`));

/**
* Exports express
* @public
*/
export default app;
