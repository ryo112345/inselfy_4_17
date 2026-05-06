ALTER TABLE conversations DROP CONSTRAINT IF EXISTS chk_conversation_fields;
DROP INDEX IF EXISTS idx_conversations_participant2;
DROP INDEX IF EXISTS idx_conversations_participant1;
DROP INDEX IF EXISTS idx_conversations_candidate_pair;
ALTER TABLE conversations DROP COLUMN IF EXISTS participant2_id;
ALTER TABLE conversations DROP COLUMN IF EXISTS participant1_id;
ALTER TABLE conversations ALTER COLUMN candidate_id SET NOT NULL;
ALTER TABLE conversations ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE conversations DROP COLUMN IF EXISTS conversation_type;
