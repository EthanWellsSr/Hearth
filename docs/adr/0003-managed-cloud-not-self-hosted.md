# Managed cloud on the free tier, not self-hosted

We rent managed cloud services rather than self-hosting on a home machine. At two
users the free tiers cost $0, and we gain a public HTTPS URL, uptime, and backups
without operating a server — and it mirrors how teams actually ship (resume
value). Self-hosting was rejected as the wrong tool for a resume project: dynamic
home IP, port-forwarding, certificates, and patching, for no upside at this
scale. The same platform scales past two users by changing a setting, so no
migration is implied.
