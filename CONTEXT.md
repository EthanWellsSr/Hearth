# Household Command Center

A shared web app where the members of one household coordinate their calendar,
tasks, shopping, meals, notes, messages, and spending in a single place.

## Language

### Household & people

**Household**:
The shared space that owns all data — calendar, lists, meals, notes, expenses.
Every piece of data belongs to exactly one Household.
_Avoid_: family, account, group, team

**User**:
A single global login identity (one person, one email). A User signs in, then
acts within a Household.
_Avoid_: account, login, profile

**User Profile**:
The global display identity for a User, containing a required display name and an
optional Avatar. One User Profile follows the User across Household memberships.
_Avoid_: Member profile, account

**Avatar**:
The image representing a User throughout Hearth. It is optional; Hearth displays
its logo when a User has not selected one.
_Avoid_: profile picture, headshot

**Membership**:
The link that makes a User part of a Household. A User participates in a
Household only through a Membership.
_Avoid_: seat

**Member**:
A User as seen from inside a Household (a User via their Membership). "Assign
the chore to a Member."
_Avoid_: partner, resident, participant

**Invite Code**:
A short Household code that lets an authenticated User join as a Member. Rotating
it invalidates the previous code.
_Avoid_: password, access key

**Invitation Link**:
A browser link containing the current Invite Code. It carries a User through sign-in
and User Profile setup to an explicit Household join confirmation.
_Avoid_: app link, signup link

**Assignee**:
The Member responsible for a specific Chore or To-do. May be unset (anyone can
do it).
_Avoid_: owner, responsible

### Tasks & lists

**Chore**:
A household task that recurs on a schedule (e.g. "trash out every Tuesday").
Recurrence is what makes it a Chore.
_Avoid_: task, duty, job

**To-do**:
A one-off task with no recurrence. May be personal or shared.
_Avoid_: task, item, reminder

**Grocery List**:
The household's shared list of things to buy. One active list per Household.
_Avoid_: shopping list

**Grocery Item**:
A single thing to buy on the Grocery List. Added by hand or generated from a Meal.
_Avoid_: product

### Calendar

**Event**:
A dated entry on the household Calendar, with a time and title, visible to all
Members.
_Avoid_: appointment, meeting, reminder

**Calendar**:
The household's shared collection of Events.

### Meals

**Meal Plan**:
The schedule of planned Meals over a period (typically a week).
_Avoid_: menu

**Meal**:
A single planned dish in a specific slot (e.g. dinner on Tuesday). Draws its
ingredients from a Recipe.
_Avoid_: dish

**Recipe**:
A named set of Ingredients (and steps) that a Meal is based on.

**Ingredient**:
A component of a Recipe. When a Meal is planned, its Ingredients can become
Grocery Items.

### Money

**Expense**:
A single purchase, shown in the money feed. Sourced manually, by import, or
(later) from a linked Payment Source.
_Avoid_: transaction, charge, payment, cost

**Payment Source**:
A linked card or bank account that Expenses are pulled from via a third-party
aggregator. Distinct from a User's login.
_Avoid_: account, card, bank

### Communication

**Note**:
Shared, persistent information posted to the household board (e.g. "wifi password
is X"). Reference material, not a conversation.
_Avoid_: memo, post

**Message**:
A conversational message sent between Members inside the app. Everyday chatter,
unlike a Note.
_Avoid_: text, DM, chat
