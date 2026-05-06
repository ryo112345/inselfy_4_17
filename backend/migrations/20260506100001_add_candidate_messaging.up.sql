-- Add conversation type discriminator
ALTER TABLE conversations
  ADD COLUMN conversation_type TEXT NOT NULL DEFAULT 'company_candidate'
    CHECK (conversation_type IN ('company_candidate', 'candidate_candidate'));

-- Make company_id and candidate_id nullable for candidate-candidate conversations
ALTER TABLE conversations ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE conversations ALTER COLUMN candidate_id DROP NOT NULL;

-- Add columns for candidate-candidate participant tracking
ALTER TABLE conversations
  ADD COLUMN participant1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN participant2_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Unique constraint: one DM conversation per user pair (smaller UUID first)
CREATE UNIQUE INDEX idx_conversations_candidate_pair
  ON conversations(participant1_id, participant2_id)
  WHERE conversation_type = 'candidate_candidate';

-- Index for listing candidate-candidate conversations
CREATE INDEX idx_conversations_participant1
  ON conversations(participant1_id, last_message_at DESC)
  WHERE conversation_type = 'candidate_candidate';
CREATE INDEX idx_conversations_participant2
  ON conversations(participant2_id, last_message_at DESC)
  WHERE conversation_type = 'candidate_candidate';

-- Check constraint: company conversations must have company_id,
-- candidate conversations must have participant1/2
ALTER TABLE conversations ADD CONSTRAINT chk_conversation_fields CHECK (
  (conversation_type = 'company_candidate' AND company_id IS NOT NULL)
  OR
  (conversation_type = 'candidate_candidate' AND participant1_id IS NOT NULL AND participant2_id IS NOT NULL)
);
