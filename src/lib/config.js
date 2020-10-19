const dotenv = require('dotenv');
const result = dotenv.config();
let envs = {};
if (!result.error) {
  envs = result.parsed;
}
module.exports = {
  ...envs,
  ...process.env
};
