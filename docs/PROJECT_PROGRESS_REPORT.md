# Academic Portal Project Report

## 1. Project Aim

The Academic Portal is designed to improve learning outcomes by making student doubt resolution structured, trackable, and role-based.

Core aims:

- Give students a simple workflow to raise academic doubts.
- Enable professors to monitor class-level confusion and intervene early.
- Allow TAs to resolve assigned queries quickly in focused discussion threads.
- Build a foundation for data-driven teaching improvements.

## 2. Methodology Used

The project follows a modular web application approach with clear separation of concerns.

Method used in implementation:

- Role-based design: separate journeys for Student, TA, and Professor.
- API-first backend: each major domain (auth, courses, threads, professor actions) has dedicated route modules.
- Relational data modeling: PostgreSQL schema built around users, courses, memberships, threads, and messages.
- Incremental delivery: implement authentication and course access first, then doubt thread workflows, then instructor workflows.

## 3. Technology Stack

### Frontend

- React 19
- React Router DOM
- Vite
- CSS modules/files per page layout

### Backend

- Node.js
- Express
- PostgreSQL (`pg`)
- JWT authentication (`jsonwebtoken`)
- Password hashing (`bcryptjs`)
- Environment-based configuration (`dotenv`)

### Development Tools

- Nodemon for backend development
- ESLint for frontend linting

## 4. Work Done in This Project

The following modules are already implemented in the current codebase:

- Authentication module:
  - Signup and login flows.
  - Role-linked access behavior.
- Course module:
  - Course creation and listing.
  - Course join access via codes.
  - Course management operations including enrollment updates and role changes (Student/TA/Professor) within course context.
  - Course membership mapping.
- Doubt thread and chat module:
  - Thread creation and threaded messaging.
  - Thread status handling (open/closed).
  - Escalation path to professor.
- Instructor/TA workflow:
  - Instructor-side views and management pages.
  - TA/Professor role handling in course context.
- Core database foundation:
  - SQL schema with users, courses, course_members, threads, and messages tables.

## 5. Future Scope

Planned next enhancements for product maturity:

- Add media support in chat (new requirement):
  - Students and TAs should be able to upload and share photos, videos, and audio in doubt conversations.
  - Add backend file upload handling and metadata storage.
  - Add frontend attachment UI in chat and secure media rendering.
- Add multi-device support:
  - Ensure responsive UI and usability across phones, tablets, and desktops.
  - Validate key workflows (login, course access, chat, instructor actions) on different screen sizes.
- Add stricter validations and improved error handling across APIs.
- Strengthen authorization checks for edge cases.
- Add automated tests (unit/integration) for backend routes and critical frontend flows.
- Improve deployment documentation for staging/production.

## 6. Current Results and Outcomes

Current project outcomes:

- The platform already supports end-to-end text-based doubt resolution from login to thread response.
- Professors can oversee and manage student query flow at course level.
- Course management workflows support creating courses, joining courses, and managing role assignments inside course membership.
- TAs can participate in assigned support workflows.
- The database model supports scalable expansion for future features.

Expected result after remaining work:

- Richer, context-aware doubt resolution through photo/video/audio sharing.
- Better reliability, validation, and deployment readiness.
- A stronger classroom feedback loop for improving lecture planning.
