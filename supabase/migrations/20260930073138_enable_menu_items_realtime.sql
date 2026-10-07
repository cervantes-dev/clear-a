-- Lets the student app hear about availability/special/price/name changes on
-- menu items live (orders and menu_item_daily_stock were enabled earlier).
alter publication supabase_realtime add table menu_items;