/**
 * notFound.js
 * -----------
 * Catch-all for unmatched routes — returns a clean 404 JSON response.
 */

export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};
