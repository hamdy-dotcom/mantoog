-- مدير الأرباح (P&L Optimizer): per-product cost of goods, set from the agents panel.
alter table products add column if not exists cost_price numeric;
