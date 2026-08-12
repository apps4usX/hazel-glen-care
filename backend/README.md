# Hazel Glen Care — Backend API

Node.js + Express + Prisma (PostgreSQL). JWT auth with role-based access
(ADMIN / STAFF / CLIENT), the scheduling engine, and the AI-matching services.

## Run
```bash
npm install
cp .env.example .env          # then edit DATABASE_URL + JWT_SECRET
npm run prisma:generate
npm run prisma:migrate        # creates tables
npm run dev                   # http://localhost:4000
```

## API surface
```
GET  /api/health

POST /api/auth/register           { email, password, role, firstName?, lastName?, clientId? }
POST /api/auth/login              { email, password }         -> { token, user }
GET  /api/auth/me                 (Bearer)

# shifts (Bearer; writes are ADMIN)
GET  /api/shifts?status=&from=&to=&clientId=&careType=
GET  /api/shifts/:id
POST /api/shifts                  (ADMIN)
PATCH/api/shifts/:id              (ADMIN)
DELETE /api/shifts/:id            (ADMIN, soft-cancel)
GET  /api/shifts/:id/candidates   (ADMIN)  -> ranked eligible staff
POST /api/shifts/:id/auto-assign  (ADMIN)  { autoConfirm? }
POST /api/shifts/:id/broadcast    (ADMIN)  emergency broadcast

# recruitment (jobs list + apply are public)
GET  /api/recruitment/jobs?status=
GET  /api/recruitment/jobs/:id
POST /api/recruitment/applications                 (public)
POST /api/recruitment/jobs                          (ADMIN)
GET  /api/recruitment/applications?status=&jobPostId= (ADMIN)
POST /api/recruitment/applications/:id/screen       (ADMIN)  { cvText? }

# compliance (ADMIN)
GET  /api/compliance/staff/:staffId?warnWithinDays=30
POST /api/compliance/scan          { withinDays? }

# reports (ADMIN)
GET  /api/reports?type=
POST /api/reports                  { type, start, end }
```

## Auth
Send `Authorization: Bearer <token>` from `/auth/login`. The JWT carries the
user id + role; `authorize('ADMIN')` guards admin-only routes.

## Layout
```
src/
  config/     db.js env.js logger.js
  middleware/ auth.middleware.js role.middleware.js error.middleware.js
  utils/      auth.js http.js geo.js time.js
  services/   scheduling.service.js ai-matching.service.js compliance.service.js
  controllers/auth shifts recruitment compliance reports
  routes/     one module per resource + index.js
  app.js server.js
prisma/schema.prisma
```
