/**
 * Shared query-building helpers used across controllers.
 */

/**
 * Strips undefined/null values from a filter object so Sequelize
 * doesn't include those fields in the WHERE clause.
 *
 * @param {Object} rawFilters
 * @returns {Object}
 */
exports.buildFilterQuery = (rawFilters = {}) => {
  return Object.entries(rawFilters).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      acc[key] = value;
    }
    return acc;
  }, {});
};

/**
 * Builds a Sequelize-compatible ORDER array while guarding against
 * column injection by requiring the column to be in an allowList.
 *
 * @param {string} sort        - Column name from query string
 * @param {string} order       - "asc" | "desc"
 * @param {string[]} allowList - Permitted sort columns
 * @returns {Array}
 */
exports.buildSortClause = (sort, order, allowList = []) => {
  const safeColumn = allowList.includes(sort) ? sort : allowList[0];
  const safeOrder = order?.toLowerCase() === "desc" ? "DESC" : "ASC";
  return [[safeColumn, safeOrder]];
};
