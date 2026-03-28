-- In-app notifications for thread replies and @mentions
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('reply', 'mention')),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_thread_id ON notifications(thread_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see and update their own notifications (create only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can view own notifications'
  ) THEN
    CREATE POLICY "Users can view own notifications"
      ON notifications FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can update own notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications"
      ON notifications FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- Function to create notification rows when a comment is inserted.
-- Runs as definer so it can insert for any user_id.
CREATE OR REPLACE FUNCTION public.create_comment_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_author_id UUID;
  v_mentioned_ids TEXT[] := ARRAY[]::TEXT[];
  v_match TEXT[];
  v_content TEXT := COALESCE(NEW.content, '');
BEGIN
  -- Get thread author
  SELECT created_by INTO v_thread_author_id
  FROM threads WHERE id = NEW.thread_id;

  -- Extract mentioned user IDs: @[Name](userId) -> capture userId
  FOR v_match IN SELECT (regexp_matches(v_content, '@\[[^\]]+\]\(([^)]+)\)', 'g'))
  LOOP
    IF v_match[1] IS NOT NULL AND v_match[1] <> NEW.created_by::TEXT THEN
      v_mentioned_ids := array_append(v_mentioned_ids, v_match[1]);
    END IF;
  END LOOP;
  v_mentioned_ids := ARRAY(SELECT DISTINCT unnest(v_mentioned_ids));

  -- Notify mentioned users (type = mention)
  IF array_length(v_mentioned_ids, 1) > 0 THEN
    INSERT INTO notifications (user_id, type, thread_id, comment_id, actor_id)
    SELECT u::UUID, 'mention', NEW.thread_id, NEW.id, NEW.created_by
    FROM unnest(v_mentioned_ids) AS u;
  END IF;

  -- Notify thread author (if not the commenter and not already mentioned)
  IF v_thread_author_id IS NOT NULL
     AND v_thread_author_id <> NEW.created_by
     AND NOT (v_thread_author_id::TEXT = ANY(v_mentioned_ids)) THEN
    INSERT INTO notifications (user_id, type, thread_id, comment_id, actor_id)
    VALUES (v_thread_author_id, 'reply', NEW.thread_id, NEW.id, NEW.created_by);
  END IF;

  -- Notify previous commenters (reply), excluding commenter, thread author, and mentioned
  INSERT INTO notifications (user_id, type, thread_id, comment_id, actor_id)
  SELECT DISTINCT c.created_by, 'reply', NEW.thread_id, NEW.id, NEW.created_by
  FROM comments c
  WHERE c.thread_id = NEW.thread_id
    AND c.id <> NEW.id
    AND c.created_by IS NOT NULL
    AND c.created_by <> NEW.created_by
    AND (v_thread_author_id IS NULL OR c.created_by <> v_thread_author_id)
    AND NOT (c.created_by::TEXT = ANY(v_mentioned_ids));

  RETURN NEW;
END;
$$;

-- Create trigger only if it does not exist (non-destructive)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'comments' AND t.tgname = 'trigger_create_comment_notifications'
  ) THEN
    CREATE TRIGGER trigger_create_comment_notifications
      AFTER INSERT ON comments
      FOR EACH ROW
      EXECUTE FUNCTION public.create_comment_notifications();
  END IF;
END
$$;

COMMENT ON TABLE notifications IS 'In-app notifications for Hangar Talk replies and @mentions';
