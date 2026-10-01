const searchService = require('../services/searchService');
const wrapAsync = require('../middleware/asyncWrapper');

/**
 * GET /search
 * Global Search across Notes, Doubts, Faculty, Subjects & Topics
 */
exports.getGlobalSearch = wrapAsync(async (req, res) => {
  const data = await searchService.globalSearch(req.query);

  res.render('search/index', {
    title: data.query ? `Search Results for "${data.query}" — StudyShare` : 'Global Academic Search — StudyShare',
    path: '/search',
    query: data.query,
    type: data.type,
    results: data.results,
    counts: data.counts,
    page: data.page,
    totalPages: data.totalPages,
    totalResults: data.totalResults,
    queryParams: req.query,
  });
});
