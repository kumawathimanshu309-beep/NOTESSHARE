const facultyService = require('../services/facultyService');
const wrapAsync = require('../middleware/asyncWrapper');

/**
 * GET /faculty
 * Public Faculty Directory with Search, Filters & Pagination
 */
exports.getFacultyDirectory = wrapAsync(async (req, res) => {
  const data = await facultyService.getFacultyDirectory(req.query);

  res.render('faculty/index', {
    title: 'Faculty Directory & Verified Teachers — StudyShare',
    path: '/faculty',
    facultyList: data.facultyList,
    totalFaculty: data.totalFaculty,
    page: data.page,
    totalPages: data.totalPages,
    limit: data.limit,
    filterOptions: data.filterOptions,
    query: req.query,
  });
});

/**
 * GET /faculty/:id
 * Public Faculty Profile Page
 */
exports.getFacultyProfile = wrapAsync(async (req, res) => {
  const identifier = req.params.id;
  const { teacher, resources, answers, stats } = await facultyService.getFacultyProfile(identifier);

  res.render('teachers/show', {
    title: `${teacher.name} — Verified Teacher Profile`,
    path: '/faculty',
    teacher,
    resources,
    answers,
    stats,
  });
});
