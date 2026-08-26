# Expenses via a bank aggregator, mock-first, no direct credentials

Live card and bank Expenses will be sourced through a third-party aggregator
(e.g. Plaid), never by handling bank credentials ourselves — the user links their
bank inside the aggregator's own secure flow, which our app never sees. The
feature is built last and against manual / mock data first, because production
bank access carries approval friction, cost, and sensitive-data risk. Building it
early, or capturing bank credentials directly, was rejected on safety and
sequencing grounds.
