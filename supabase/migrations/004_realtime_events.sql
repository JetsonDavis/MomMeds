-- Enable Supabase Realtime (WebSocket) broadcasts for new patient events.
ALTER PUBLICATION supabase_realtime ADD TABLE events;
