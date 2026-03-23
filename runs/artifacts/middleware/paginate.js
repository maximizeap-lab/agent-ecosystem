/**
 * Pagination middleware
 * Parses ?page and ?limit query params and attaches a
 * `req.pagination` object { page, limit, offset } to every request.
 */
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

module.exports = function paginate(req, res, next) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
  const offset = (page - 1) * limit;

  req.pagination = { page, limit, offset };
  next();
};
