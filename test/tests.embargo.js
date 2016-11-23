'use strict';

const Hapi = require('hapi');
const code = require('code');
const lab = exports.lab = require('lab').script();
const hapiEmbargo = require('../index.js');
const async = require('async');
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
lab.test('will send an error if no embargoEnd is specified', (done) => {
  server.register({
    register: hapiEmbargo,
    options: {},
  }, (err) => {
    code.expect(err).to.include('must specify');
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
      config: {
        tags: ['embargo']
      },
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
      config: {
        tags: ['embargo']
      },
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
lab.test('will allow a request if the bypass option is matched by a query', { timeout: 5000 }, (allDone) => {
  server.route({
    path: '/',
    method: 'GET',
    config: {
      tags: ['embargo']
    },
    handler: (request, reply) => {
      reply('The embargo must have been lifted.');
    }
  });
  async.auto({
    register: (done) => {
      server.register({
        register: hapiEmbargo,
        options: {
          embargoEnd: new Date(new Date().getTime() + 10000),
          bypass: 'theKey'
        }
      }, done);
    },
    pass: ['register', (results, done) => {
      server.inject({
        url: '/?bypass=theKey',
        method: 'GET'
      }, (response) => {
        code.expect(response.statusCode).to.equal(200);
        code.expect(response.result).to.equal('The embargo must have been lifted.');
        done();
      });
    }],
    fail: ['register', (results, done) => {
      server.inject({
        url: '/',
        method: 'GET'
      }, (response) => {
        code.expect(response.statusCode).to.equal(200);
        code.expect(response.result).to.equal('Page Unavailable');
        done();
      });
    }]
  }, allDone);
});
lab.test('will allow a request if not marked as a view (static files, etc are returned)', { timeout: 5000 }, (allDone) => {
  async.auto({
    views: (done) => {
      server.register(require('vision'), done);
    },
    embargo: (done) => {
      server.register({
        register: hapiEmbargo,
        options: {
          embargoEnd: new Date(new Date().getTime() + 10000),
        }
      }, done);
    }
  }, (err) => {
    code.expect(err).to.equal(null);
    server.views({
      engines: {
        html: require('handlebars')
      },
      relativeTo: __dirname,
      path: 'templates'
    });
    // view route:
    server.route({
      path: '/',
      method: 'GET',
      handler: {
        view: 'index'
      }
    });
    // non-view route:
    server.route({
      path: '/noView',
      method: 'GET',
      handler: (request, reply) => {
        reply('This is fine.');
      }
    });
    server.inject({
      url: '/noView',
      method: 'GET',
    }, (response) => {
      code.expect(response.statusCode).to.equal(200);
      code.expect(response.result).to.equal('This is fine.');
      server.inject({
        url: '/',
        method: 'GET'
      }, (response2) => {
        code.expect(response2.statusCode).to.equal(200);
        code.expect(response2.result).to.not.equal('Embargo lifted.');
        return allDone();
      });
    });
  });
});
lab.test('can read a specific date format', { timeout: 5000 }, (done) => {
  server.register({
    register: hapiEmbargo,
    options: {
      embargoEnd: '11/30/16 1:00 AM PST',
      viewsOnly: false
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
