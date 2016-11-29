'use strict';
const defaults = require('lodash.defaults');
const get = require('lodash.get');
const defaultOptions = {
  // the date the embargo will be lifted:
  embargoEnd: null,
  embargoEndMethod: null,
  embargoResponse: 'Page Unavailable',
  embargoHttpCode: 503,
  tag: 'embargo'
};

exports.register = (server, config, next) => {
  const options = defaults(config, defaultOptions);

  const getEndTime = function(done) {
    if (options.embargoEnd) {
      return done(null, new Date(options.embargoEnd));
    }
    if (options.embargoEndMethod) {
      const fn = get(server.methods, options.embargoEndMethod);
      return fn(done);
    }
    done();
  };

  getEndTime((err, endTime) => {
    if (err || !endTime) {
      return next('You must specify a time for the embargo to end by passing the embargoEnd or embargoEndMethod parameter');
    }

    // log time that the embargo will be lifted:
    server.log(['hapi-embargo', 'info'], `Embargo will be lifted at ${endTime}, time is now ${new Date()}`);
    server.ext({
      type: 'onPreAuth',
      method: (request, reply) => {
        // if bypass option matches then let them pass:
        if (options.bypass && request.query.bypass === options.bypass) {
          server.log(['hapi-embargo', 'info'], {
            message: 'Embargo bypassed',
            url: request.url.path,
            routePath: request.route.path,
            referrer: request.info.referrer,
            ipAddress: request.info.remoteAddress,
            userAgent: request.headers['user-agent']
          });
          return reply.continue();
        }
        if (!request.route.settings.tags || request.route.settings.tags.indexOf(options.tag) === -1) {
          return reply.continue();
        }
        // otherwise see if the embargo is expired
        const currentTime = new Date();
        getEndTime((err2, endTime2) => {
          if (currentTime.getTime() < endTime2.getTime()) {
            return reply(options.embargoResponse).code(options.embargoHttpCode);
          }
          return reply.continue();
        });
      }
    });
    next();
  });
};

exports.register.attributes = {
  pkg: require('./package.json')
};
