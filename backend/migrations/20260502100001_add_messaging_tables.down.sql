DROP TRIGGER IF EXISTS trg_notify_new_message ON messages;
DROP FUNCTION IF EXISTS notify_new_message();
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversation_participants;
DROP TABLE IF EXISTS conversations;
