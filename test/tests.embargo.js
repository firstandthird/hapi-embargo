'use strict';

const Hapi = require('hapi');
const code = require('code');
const lab = exports.lab = require('lab').script();
const hapiEmbargo = require('../index.js');

let server;
lab.beforeEach((done) => {
  server = new Hapi.Server({
    debug: {
      log: ['hapi-embargo']
    }
  });
  server.connection();
  done();
});

lab.afterEach((done) => {
  server.stop(() => {
    done();
  });
});

lab.test('will embargo a request if made before the specified time', { timeout: 5000 }, (done) => {
  server.register({
    register: hapiEmbargo,
    options: {
      embargoEnd: new Date(new Date().getTime() + 10000)
    },
  }, (err) => {
    code.expect(err).to.equal(undefined);
    server.route({
      path: '/',
      method: 'GET',
      handler: (request, reply) => {
        reply('The embargo must have been lifted.');
      }
    });
    server.inject({
      url: '/',
      method: 'GET'
    }, (response) => {
      code.expect(response.statusCode).to.equal(200);
      code.expect(response.result).to.equal('Page Unavailable');
      done();
    });
  });
});
lab.test('will allow a request if made after the specified time', { timeout: 5000 }, (done) => {
  server.register({
    register: hapiEmbargo,
    options: {
      embargoEnd: new Date(new Date().getTime() - 10000)
    },
  }, (err) => {
    code.expect(err).to.equal(undefined);
    server.route({
      path: '/',
      method: 'GET',
      handler: (request, reply) => {
        reply('The embargo must have been lifted.');
      }
    });
    server.inject({
      url: '/',
      method: 'GET'
    }, (response) => {
      code.expect(response.statusCode).to.equal(200);
      code.expect(response.result).to.equal('The embargo must have been lifted.');
      done();
    });
  });
});
