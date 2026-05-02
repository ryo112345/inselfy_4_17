CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company_accounts(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, candidate_id)
);
CREATE INDEX idx_conversations_company ON conversations(company_id, last_message_at DESC);
CREATE INDEX idx_conversations_candidate ON conversations(candidate_id, last_message_at DESC);

CREATE TABLE conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    participant_type TEXT NOT NULL CHECK (participant_type IN ('candidate', 'company')),
    participant_id UUID NOT NULL,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(conversation_id, participant_type, participant_id)
);
CREATE INDEX idx_conv_participants_lookup ON conversation_participants(participant_type, participant_id);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('candidate', 'company')),
    sender_id UUID NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at ASC);
CREATE INDEX idx_messages_created_desc ON messages(conversation_id, created_at DESC);

CREATE OR REPLACE FUNCTION notify_new_message() RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify('new_message', json_build_object(
        'conversation_id', NEW.conversation_id,
        'message_id', NEW.id,
        'sender_type', NEW.sender_type,
        'sender_id', NEW.sender_id
    )::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_new_message
    AFTER INSERT ON messages FOR EACH ROW
    EXECUTE FUNCTION notify_new_message();
