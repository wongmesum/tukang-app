-- Chat messages table for customer-worker messaging
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  sender_role VARCHAR(10) NOT NULL CHECK (sender_role IN ('customer', 'worker')),
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_messages_order_sent ON chat_messages(order_id, sent_at);
