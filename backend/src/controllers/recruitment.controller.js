// Recruitment controller: job posts, applications, AI CV screening.
const { prisma } = require('../config/db');
const { ApiError } = require('../utils/http');
const { screenApplicantCV } = require('../services/ai-matching.service');

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** GET /api/recruitment/jobs?status= */
async function listJobs(req, res) {
  const where = req.query.status ? { status: req.query.status } : {};
  const jobs = await prisma.jobPost.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { applications: true } } },
  });
  res.json({ jobs });
}

/** POST /api/recruitment/jobs */
async function createJob(req, res) {
  const { title, careType, description } = req.body;
  if (!title || !careType || !description) {
    throw ApiError.badRequest('title, careType and description are required');
  }
  const job = await prisma.jobPost.create({
    data: { ...req.body, slug: req.body.slug || slugify(title), status: req.body.status || 'OPEN' },
  });
  res.status(201).json({ job });
}

/** GET /api/recruitment/jobs/:id */
async function getJob(req, res) {
  const job = await prisma.jobPost.findUnique({
    where: { id: req.params.id },
    include: { applications: true },
  });
  if (!job) throw ApiError.notFound('Job not found');
  res.json({ job });
}

/** POST /api/recruitment/applications  (public) */
async function apply(req, res) {
  const { firstName, lastName, email } = req.body;
  if (!firstName || !lastName || !email) {
    throw ApiError.badRequest('firstName, lastName and email are required');
  }
  const application = await prisma.application.create({ data: req.body });
  res.status(201).json({ application });
}

/** GET /api/recruitment/applications?status=&jobPostId= */
async function listApplications(req, res) {
  const { status, jobPostId } = req.query;
  const where = { ...(status && { status }), ...(jobPostId && { jobPostId }) };
  const applications = await prisma.application.findMany({
    where,
    orderBy: [{ aiScore: 'desc' }, { createdAt: 'desc' }],
    include: { jobPost: { select: { title: true } } },
  });
  res.json({ applications });
}

/** POST /api/recruitment/applications/:id/screen  { cvText? } */
async function screen(req, res) {
  const result = await screenApplicantCV(req.params.id, req.body.cvText);
  res.json(result);
}


/** PATCH /api/recruitment/applications/:id/status  { status } */
async function setStatus(req, res) {
  const valid = ['RECEIVED','SCREENING','SHORTLISTED','INTERVIEW','OFFER','HIRED','REJECTED','WITHDRAWN'];
  if (!valid.includes(req.body.status)) throw ApiError.badRequest(`status must be one of ${valid.join(', ')}`);
  const application = await prisma.application.update({ where: { id: req.params.id }, data: { status: req.body.status } });
  res.json({ application });
}

module.exports = { listJobs, createJob, getJob, apply, listApplications, screen, setStatus };
