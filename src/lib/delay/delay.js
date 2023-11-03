/**
 * Delays a given number of milliseconds
 * @param {number} ms The number of milliseconds to wait
 * @returns {Promise} A promise that resolves after the given amount of time
 */
const delay = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

module.exports = {
  delay,
};
