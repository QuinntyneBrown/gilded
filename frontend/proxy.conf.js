const apiPort = process.env['API_PORT'] ?? '43121';

module.exports = {
  '/api': {
    target: `http://localhost:${apiPort}`,
    secure: false,
  },
};
