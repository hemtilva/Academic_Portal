CREATE TABLE IF NOT EXISTS users (
  user_id        SERIAL PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('student', 'professor', 'ta'))
);

CREATE TABLE IF NOT EXISTS threads (
  thread_id   SERIAL PRIMARY KEY,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  student_id  INTEGER NOT NULL REFERENCES users(user_id),
  ta_id       INTEGER REFERENCES users(user_id),
  title       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  message_id  SERIAL PRIMARY KEY,
  thread_id   INTEGER NOT NULL REFERENCES threads(thread_id) ON DELETE CASCADE,
  sender_id   INTEGER NOT NULL REFERENCES users(user_id),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_thread_id_message_id_idx
  ON messages(thread_id, message_id);
