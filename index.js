'use strict';
const defaults = require('lodash.defaults');
const moment = require('moment-timezone');
const defaultOptions = {
  // the date the embargo will be lifted:
  embargoEnd: null,
  embargoResponse: 'Page Unavailable',
  viewsOnly: true
  // routes with these tags could be included, and leave bank to do all routes:
  // tags: []
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
    type: 'onRequest',
    method: (request, reply) => {
      // if bypass option matches then let them pass:
      if (options.bypass && request.query.bypass === options.bypass) {
        return reply.continue();
      }
      // if it's not a view then let them pass:
      if (options.viewsOnly && !reply.render) {
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
