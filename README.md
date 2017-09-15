# Node API Boilerplate

[![Build Status](https://travis-ci.org/renanol/node-api-boilerplate.svg?branch=master)](https://travis-ci.org/renanol/node-api-boilerplate)
[![Greenkeeper badge](https://badges.greenkeeper.io/renanol/node-api-boilerplate.svg)](https://greenkeeper.io/)


## Getting Started

Clone the repo and make it yours:

```bash
git clone --depth 1 https://github.com/renanol/node-api-boilerplate && cd node-api-boilerplate
rm -rf .git
```

Install dependencies:

```bash
yarn
```

Set environment variables:

```bash
cp .env.example .env
```

## Running Locally

```bash
yarn dev
```

## Running in Production

```bash
yarn start
```

## Lint

```bash
# lint code with ESLint
yarn lint

# try to fix ESLint errors
yarn lint:fix

# lint and watch for changes
yarn lint:watch
```

## Test

```bash
# run all tests with Mocha
yarn test

# run unit tests
yarn test:unit

# run integration tests
yarn test:integration

# run all tests and watch for changes
yarn test:watch

# open nyc test coverage reports
yarn coverage
```

## Validate

```bash
# run lint and tests
yarn validate
```

## Logs

```bash
# show logs in production
pm2 logs
```

## Documentation

```bash
# generate and open api documentation
yarn docs
```

## Inspirations

 - [danielfsousa/express-mongoose-es6-rest-api](https://github.com/danielfsousa/express-rest-es2017-boilerplate)

## License

[MIT License](README.md) - [Renan Oliveira](https://github.com/renanol)
