CREATE TABLE IF NOT EXISTS users (
  user_id        SERIAL PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('student', 'professor', 'ta'))
);

CREATE TABLE IF NOT EXISTS courses (
  course_id   SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  professor_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  join_code   VARCHAR(10) UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS course_members (
  member_id   SERIAL PRIMARY KEY,
  course_id   INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('student', 'professor', 'ta')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, user_id)
);

CREATE INDEX IF NOT EXISTS course_members_course_id_idx ON course_members(course_id);
CREATE INDEX IF NOT EXISTS course_members_user_id_idx ON course_members(user_id);

CREATE TABLE IF NOT EXISTS threads (
  thread_id   SERIAL PRIMARY KEY,
  course_id   INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  student_id  INTEGER NOT NULL REFERENCES users(user_id),
  ta_id       INTEGER REFERENCES users(user_id),
  title       TEXT NOT NULL,
  is_escalated_to_professor BOOLEAN NOT NULL DEFAULT FALSE,
  escalated_at TIMESTAMPTZ
);

ALTER TABLE threads
  ADD COLUMN IF NOT EXISTS is_escalated_to_professor BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE threads
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;

ALTER TABLE threads
  ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(course_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS threads_course_id_idx ON threads(course_id);
CREATE INDEX IF NOT EXISTS threads_student_id_idx ON threads(student_id);
CREATE INDEX IF NOT EXISTS threads_course_status_idx ON threads(course_id, status);

CREATE TABLE IF NOT EXISTS messages (
  message_id  SERIAL PRIMARY KEY,
  thread_id   INTEGER NOT NULL REFERENCES threads(thread_id) ON DELETE CASCADE,
  sender_id   INTEGER NOT NULL REFERENCES users(user_id),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_thread_id_message_id_idx
  ON messages(thread_id, message_id);

CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at);
