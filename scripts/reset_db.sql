-- Wipe all application data while keeping schema intact
-- Resets sequences and cascades through FKs
TRUNCATE TABLE
  ticket,
  ticket_type,
  purchase,
  contact,
  customer,
  person,
  event_promotion,
  event
RESTART IDENTITY CASCADE;

