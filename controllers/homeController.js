const wrapAsync = require('../middleware/asyncWrapper');
const Note = require('../models/Note');
const HomeCard = require('../models/HomeCard');
const Bookmark = require('../models/Bookmark');
const Rating = require('../models/Rating');

// @desc    Render Landing / Home Page with Dynamic Category Counts & Top Popular Notes
// @route   GET /
exports.getHome = wrapAsync(async (req, res) => {
  // Fetch dynamic published public notes count per category & popular notes
  const [csCount, mathCount, sciCount, engCount, dbHomeCards, popularNotesDocs] = await Promise.all([
    Note.countDocuments({ subject: 'Computer Science', isPublished: true, isDeleted: false, approvalStatus: 'approved' }),
    Note.countDocuments({ subject: 'Mathematics', isPublished: true, isDeleted: false, approvalStatus: 'approved' }),
    Note.countDocuments({ subject: 'Science', isPublished: true, isDeleted: false, approvalStatus: 'approved' }),
    Note.countDocuments({ subject: 'Engineering', isPublished: true, isDeleted: false, approvalStatus: 'approved' }),
    HomeCard.find({ isPublished: true, isEnabled: true, isDeleted: false })
      .sort({ order: 1, createdAt: -1 })
      .lean(),
    Note.find({ isPublished: true, visibility: 'public', isDeleted: false, approvalStatus: 'approved' })
      .populate('author', 'name username avatar role')
      .sort({ downloads: -1, views: -1, createdAt: -1 })
      .limit(3)
      .lean(),
  ]);

  // Query ratings for popular notes to aggregate real average rating
  const noteIds = popularNotesDocs.map((n) => n._id);
  const ratingAgg = noteIds.length > 0 ? await Rating.aggregate([
    { $match: { note: { $in: noteIds } } },
    { $group: { _id: '$note', avgRating: { $avg: '$rating' } } },
  ]) : [];

  const ratingMap = {};
  ratingAgg.forEach((r) => {
    ratingMap[r._id.toString()] = r.avgRating.toFixed(1);
  });

  const previewNotes = popularNotesDocs.map((note) => ({
    id: note._id.toString(),
    title: note.title,
    subject: note.subject,
    downloads: note.downloads ? (note.downloads >= 1000 ? `${(note.downloads / 1000).toFixed(1)}k` : `${note.downloads}`) : '0',
    rating: ratingMap[note._id.toString()] || '5.0',
    icon: note.subject === 'Computer Science' ? '⌘' : note.subject === 'Mathematics' ? '∑' : note.subject === 'Science' ? '⚗' : '◈',
    author: note.author || null,
  }));

  // Fetch real statistics for the embedded dashboard preview based on req.user state
  let previewStats = {
    label1: 'Notes Saved',
    value1: '0',
    label2: 'Notes Shared',
    value2: '0',
    label3: 'Downloads',
    value3: '0',
  };

  if (req.user) {
    const userId = req.user._id;
    if (req.user.role === 'teacher') {
      const [authoredCount, aggregateStats] = await Promise.all([
        Note.countDocuments({ author: userId, isDeleted: false }),
        Note.aggregate([
          { $match: { author: userId, isDeleted: false } },
          { $group: { _id: null, downloads: { $sum: '$downloads' }, views: { $sum: '$views' } } },
        ]),
      ]);
      const downloadsSum = aggregateStats.length > 0 ? aggregateStats[0].downloads : 0;
      const viewsSum = aggregateStats.length > 0 ? aggregateStats[0].views : 0;

      previewStats = {
        label1: 'Notes Shared',
        value1: authoredCount >= 1000 ? `${(authoredCount / 1000).toFixed(1)}k` : `${authoredCount}`,
        label2: 'Total Views',
        value2: viewsSum >= 1000 ? `${(viewsSum / 1000).toFixed(1)}k` : `${viewsSum}`,
        label3: 'Downloads',
        value3: downloadsSum >= 1000 ? `${(downloadsSum / 1000).toFixed(1)}k` : `${downloadsSum}`,
      };
    } else {
      // Student / Admin role
      const [savedCount, sharedCount, aggregateStats] = await Promise.all([
        Bookmark.countDocuments({ user: userId }),
        Note.countDocuments({ author: userId, isDeleted: false }),
        Note.aggregate([
          { $match: { author: userId, isDeleted: false } },
          { $group: { _id: null, downloads: { $sum: '$downloads' } } },
        ]),
      ]);
      const downloadsSum = aggregateStats.length > 0 ? aggregateStats[0].downloads : 0;

      previewStats = {
        label1: 'Notes Saved',
        value1: savedCount >= 1000 ? `${(savedCount / 1000).toFixed(1)}k` : `${savedCount}`,
        label2: 'Notes Shared',
        value2: sharedCount >= 1000 ? `${(sharedCount / 1000).toFixed(1)}k` : `${sharedCount}`,
        label3: 'Downloads',
        value3: downloadsSum >= 1000 ? `${(downloadsSum / 1000).toFixed(1)}k` : `${downloadsSum}`,
      };
    }
  } else {
    // Guest User: Real Public Platform Aggregates
    const [totalPublicNotes, totalDownloadsResult] = await Promise.all([
      Note.countDocuments({ isPublished: true, isDeleted: false, visibility: 'public' }),
      Note.aggregate([
        { $match: { isPublished: true, isDeleted: false, visibility: 'public' } },
        { $group: { _id: null, totalDownloads: { $sum: '$downloads' } } },
      ]),
    ]);
    const totalDownloads = totalDownloadsResult.length > 0 ? totalDownloadsResult[0].totalDownloads : 0;

    previewStats = {
      label1: 'Public Notes',
      value1: totalPublicNotes >= 1000 ? `${(totalPublicNotes / 1000).toFixed(1)}k` : `${totalPublicNotes}`,
      label2: 'Total Downloads',
      value2: totalDownloads >= 1000 ? `${(totalDownloads / 1000).toFixed(1)}k` : `${totalDownloads}`,
      label3: 'Community',
      value3: 'Active',
    };
  }

  const defaultFeatures = [
    {
      icon: '⌕',
      title: 'Find Notes Faster',
      description: 'Search and discover useful notes, study materials and resources in seconds.',
    },
    {
      icon: '↗',
      title: 'Share Your Knowledge',
      description: 'Upload your notes and help other students learn from your work.',
    },
    {
      icon: '★',
      title: 'Quality Resources',
      description: 'Discover highly-rated notes shared by students from different subjects.',
    },
  ];

  const features = dbHomeCards.length > 0 ? dbHomeCards : defaultFeatures;

  const subjects = [
    { name: 'Computer Science', icon: '⌘', notesCount: `${csCount} notes`, isPurple: true },
    { name: 'Mathematics', icon: '∑', notesCount: `${mathCount} notes`, isPurple: false },
    { name: 'Science', icon: '⚗', notesCount: `${sciCount} notes`, isPurple: false },
    { name: 'Engineering', icon: '◈', notesCount: `${engCount} notes`, isPurple: false },
  ];

  res.render('home/index', {
    title: 'StudyShare — Share Knowledge, Discover Better Notes',
    path: '/',
    previewNotes,
    previewStats,
    features,
    subjects,
  });
});

// @desc    Render About Page
// @route   GET /about
exports.getAbout = wrapAsync(async (req, res) => {
  res.render('home/about', {
    title: 'About StudyShare — Student Knowledge Sharing',
    path: '/about',
  });
});

// @desc    Render Features Page
// @route   GET /features
exports.getFeatures = wrapAsync(async (req, res) => {
  const featuresList = [
    {
      title: 'Comprehensive Study Notes',
      description: 'Access curated notes covering Computer Science, Mathematics, Science, Engineering and more.',
      icon: '📚',
    },
    {
      title: 'Peer-to-Peer Knowledge Sharing',
      description: 'Upload and publish your own study notes to empower fellow students across universities.',
      icon: '🤝',
    },
    {
      title: 'Categorized & Tagged Resources',
      description: 'Easily search and filter by subject, semester, resource type (PDF, PPT, PYQs) and rating.',
      icon: '🏷️',
    },
    {
      title: 'Doubts & Community Discussion',
      description: 'Ask academic questions, reply to doubts, and engage in collaborative study groups.',
      icon: '💡',
    },
  ];

  res.render('home/features', {
    title: 'Platform Features — StudyShare',
    path: '/features',
    featuresList,
  });
});
