# Academic Portal Documentation

## 1. Code Components

### Frontend Components (`apps/web/src/pages/`)

The frontend is built using React and Vite, structured into pages and layouts:

- **Authentication & Onboarding**:
  - `Login.jsx` & `Signup.jsx`: Handle user authentication, credential submission, and registration.
  - `AuthLayout.css`: Layout styling for authentication screens.
- **Student Dashboard & Course Enrollment**:
  - `CourseAccess.jsx`: Hub for students to view joined courses and enroll in new ones via join codes.
  - `StudentDoubts.jsx`: Dashboard dedicated to tracking and managing a student's active doubt threads.
- **Instructor Dashboard**:
  - `InstructorLayout.jsx` & `InstructorPage.jsx`: The main workspace for professors and TAs to oversee their assigned courses, respond to escalated questions, and manage students.
  - `InstructorDashboardBlank.jsx`: A placeholder/empty state for the instructor view.
- **Course & Thread Interaction**:
  - `CourseHub.jsx`: Main interface for an individual course, displaying syllabus, materials, or general course information.
  - `ChatDoubt.jsx` & `DoubtsLayout.jsx`: Chat interfaces designed for nested messaging/doubt resolution between students, TAs, and professors.

### Backend Routing & Logic (`apps/api/src/routes/` & `middleware/`)

The backend relies on Express.js endpoints combined with modular logic:

- **`auth.js`**: Handles password hashing, login, and JWT/session assignments.
- **`courses.js`**: Manages course creation, fetching course lists, and processing join-code enrollments.
- **`professor.js`**: Endpoints tailored specifically to Professor/TA permissions (fetching class metrics, etc).
- **`threads.js`**: CRUD operations on doubt threads, including standard messaging, "closing" threads, and escalating threads to a Professor.
- **`health.js`**: Simple ping endpoint for health checks.
- **`middleware/auth.js`**: Handles route protection by validating incoming JWTs or standard sessions.
- **`lib/courseAccess.js`**: Shared validation logic checking if a user ID is legally enrolled in a targeted course.

---

## 2. Project/Folder Structure

```text
Academic_Portal/
├── apps/
│   ├── api/                      # Backend Node.js Express server
│   │   ├── db/
│   │   │   └── schema.sql        # Database initialization script (Table schemas)
│   │   ├── src/
│   │   │   ├── config/db.js      # PostreSQL connection setup & pooling
│   │   │   ├── lib/              # Reusable helper functions
│   │   │   ├── middleware/       # Express route interceptors (Auth, Logging)
│   │   │   ├── routes/           # API endpoints controllers
│   │   │   └── index.js          # App entrypoint
│   │   └── package.json
│   └── web/                      # Frontend Vite React application
│       ├── public/               # Static assets
│       ├── src/
│       │   ├── lib/api.js        # Axios/Fetch interceptor configuring API calls
│       │   ├── pages/            # React specific UI pages
│       │   ├── main.jsx          # React DOM entrypoint
│       │   └── App.jsx
│       ├── vite.config.js
│       └── package.json
├── docs/                         # Project Documentation
└── package.json                  # Root Monorepo configuration
```

---

## 3. Configuration Variables & Credentials

To deploy and start using this repository in your own environment, set up the following variables.

### Backend (`apps/api`)

The backend uses standard environment variables. You should create a `.env` file inside `apps/api/` and provide either a connection URI or individual parameters:

- **Database Connection URI:**
  - `DATABASE_URL` = `postgres://username:password@hostname:5432/dbname`
- **Fallback Database Variables (if no URL is provided):**
  - `DB_HOST` = (e.g., `localhost`)
  - `DB_PORT` = (e.g., `5432`)
  - `DB_USER` = (e.g., `postgres`)
  - `DB_PASSWORD` = (e.g., `your_secure_password`)
  - `DB_NAME` = (e.g., `academic_portal`)
  - `DB_SSL` = `true` (Only if your managed DB like Supabase/Neon requires SSL)
- **Server Port Configuration:**
  - `PORT` = `3001` (Default)
  - `HOST` = `0.0.0.0` (Default)

### Frontend (`apps/web`)

The frontend uses Vite environment variables. Create a `.env` file inside `apps/web/`:

- `VITE_API_BASE_URL` = `http://localhost:3001` (Replace with your backend domain in production).

---

## 4. Database Setup & Dump

Your database tables are handled by PostgreSQL. A unified SQL dump is already provided in the codebase.

**Location**: `apps/api/db/schema.sql`

This file creates all the necessary tables:

1. `users`: Stores user emails, hashed passwords, and global roles.
2. `courses`: Stores classes created by professors.
3. `course_members`: Maps users to specific classes and assigns localized roles.
4. `threads`: Stores doubt session metadata.
5. `messages`: Thread replies.

---

## 5. Instructions for Setup and Running

Follow these steps exactly after replacing the variables in section 3 with your own keys:

### Step 1: Database Initialization

1. Ensure PostgreSQL is installed and running locally, or provision a remote PostgreSQL instance (like Supabase, RDS, or Neon).
2. Create an empty database (e.g., `academic_portal`).
3. Load the SQL dump into your database:
   ```bash
   # From your command line, run:
   psql -U your_username -d academic_portal -f apps/api/db/schema.sql
   ```
   _(If using a remote DB, run the commands sequentially in their SQL editor window)._

### Step 2: Install Dependencies

Run the following at the root folder of the repository to install packages for both apps simultaneously:

```bash
npm install
```

### Step 3: Run the Development Servers

1. Open a terminal and navigate to the backend:
   ```bash
   cd apps/api
   npm run dev    # (or node src/index.js if dev script missing)
   ```
2. Open a second terminal and navigate to the frontend:
   ```bash
   cd apps/web
   npm run dev
   ```
   The frontend will print out a `localhost` URL (usually `http://localhost:5173`). Open this URL in the browser to view the running app.
