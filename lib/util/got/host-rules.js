const got = require('got');
const hostRules = require('../host-rules');

// Apply host rules to requests

// istanbul ignore next
module.exports = got.create({
  options: {
    // TODO: Move to configurable host rules
    timeout: 60 * 1000,
  },
  handler: (options, next) => {
    const { hostType, ...opts } = options;
    if (!options.hostname) {
      return next(opts);
    }
    const { username = '', password, token } = hostRules.find({
      hostType,
      url: options.href,
    });
    if (!options.headers.authorization && !options.auth) {
      if (password) {
        logger.debug(
          'Applying Basic authentication for host ' + options.hostname
        );
        opts.auth = `${username}:${password}`;
      } else if (token) {
        logger.debug(
          'Applying Bearer authentication for host ' + options.hostname
        );
        opts.headers.authorization = `Bearer ${token}`;
      }
    }
    // TODO: apply other options/headers
    // istanbul ignore next
    return next(opts);
  },
});
