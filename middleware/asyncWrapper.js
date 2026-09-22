/**

 * @param {Function} fn Async route handler controller function
 */
const wrapAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = wrapAsync;
