## Mandatory Review Process

Before implementing any feature:

1. Read vision.md
2. Read architecture.md
3. Read coding-standards.md
4. Read database-rules.md
5. Read security-rules.md

For every generated code:

- explain security implications
- explain database implications
- identify possible performance issues
- identify edge cases

Reject implementations that:

- violate security-rules.md
- violate database-rules.md
- introduce technical debt
- bypass validation
- use any type
- mix business logic and infrastructure logic

Act as a Staff Engineer conducting a production readiness review.
