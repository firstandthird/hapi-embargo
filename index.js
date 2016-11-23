'use strict';
const defaults = require('lodash.defaults');
const moment = require('moment-timezone');
const defaultOptions = {
  // the date the embargo will be lifted:
  embargoEnd: null,
  embargoResponse: 'Page Unavailable',
  tag: 'embargo'
};

exports.register = (server, config, next) => {
  const options = defaults(config, defaultOptions);
  if (!options.embargoEnd) {
    return next('You must specify a time for the embargo to end by passing the embargoEnd parameter');
  }
  options.embargoEndTime = moment(new Date(options.embargoEnd));
  // log time that the embargo will be lifted:
  server.log(['hapi-embargo', 'info'], `Embargo will be lifted at ${options.embargoEndTime}, time is now ${moment().local()}`);
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
      const currentTime = moment();
      if (currentTime.diff(options.embargoEndTime) < 0) {
        return reply(options.embargoResponse);
      }
      return reply.continue();
    }
  });
  next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};
