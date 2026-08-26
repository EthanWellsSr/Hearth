# Household is the tenancy boundary; Users join via Membership

All data belongs to exactly one Household, which is the unit of both sharing and
isolation — every query is scoped by household. A User currently belongs to only
one Household, but we model the User↔Household link as a separate **Membership**
record rather than a foreign key on User, so that multi-household support can be
added later without a data migration. The trade-off: a join table is mild
overhead now for what is effectively a 1:1 relationship, accepted to avoid a
painful reshaping of every table later.
