'use strict';
const _ = require('lodash');
const moment = require('moment');
const defaultOptions = {
  // the date the embargo will be lifted:
  embargoEnd: `${moment().local('PST').hours(1).minutes(0).seconds(0)}`, // default is 1 am PST
  embargoResponse: 'Page Unavailable',
  // routes with these tags could be included, leave bank to do all routes:
  // tags: []
};

exports.register = (server, config, next) => {
  // const tags = _.union(config.tags, defaultOptions.tags);
  const options = _.defaults(config, defaultOptions);
  options.embargoEndTime = moment(options.embargoEnd);
  // log time that the embargo will be lifted:
  server.log(['hapi-embargo', 'info'], `Embargo will be lifted at ${options.embargoEnd}, time is now ${moment()}`);
  server.ext({
    type: 'onRequest',
    method: (request, reply) => {
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
