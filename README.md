# CoDate
CoDate is an interactive web application designed to break the ice at parties and gatherings. Users answer a set of personality or preference questions and are algorithmically matched with other guests. The goal is to encourage attendees to mingle, converse, and find their "hidden matches" before the results are revealed at the end of the event. CoDate creates an environment where conversations start easier, boosting the general morale of the gathering.

# CoDate 🥂

**CoDate** is an interactive web application designed to break the ice at parties and gatherings.

> **The Concept:** Users answer a set of personality questions and are algorithmically matched with other guests. The goal is to encourage attendees to mingle, converse, and find their "hidden matches" before the results are revealed at the end of the event.

##  Features

* ** Real-Time Questionnaire:** Dynamic, engaging questions rendered instantly for guests.
* ** Global Greedy Optimization:** A custom algorithm that ensures the highest "global happiness" for the group rather than just individual matches.
* ** Verification System:** Users verify their match by exchanging unique IDs/Code Names in real life.
* ** Mobile-First Design:** Responsive UI designed to be used on phones while mingling.
* ** Admin Dashboard:** Tools for the host to manage questions, trigger the batch matching process, and reset the event.

##  The Matching Algorithm

CoDate uses a unique **Global Greedy Optimization** approach located in `/api/batch-match` to ensure fair and high-quality pairs.

1.  **Candidate Selection:** The system fetches all currently unmatched users.
2.  **Compatibility Matrix:** It performs a pairwise comparison of every user against every other user.
3.  **Scoring:** A compatibility score is calculated based on identical quiz answers (e.g., both choosing "Java" = +1 point).
4.  **Greedy Selection:**
    * All possible pairs are generated and sorted by score (Highest to Lowest).
    * The algorithm iterates through the list, locking in the highest-scoring pairs first.
    * Once a user is matched, they are removed from the pool to prevent double-booking.

*Why this matters:* This method prioritizes the group's overall compatibility score, finding the best possible couples across the entire gathering.

##  Tech Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
* **Backend:** Node.js, Express.js
* **Database:** SQLite (via `better-sqlite3`) for fast, zero-configuration storage.
* **Utilities:** `cors` for middleware, `body-parser` for JSON handling.

##  Project Structure

```text
/codate
├── public/              # Frontend files
│   ├── index.html       # User Entry Point
│   ├── admin.html       # Admin Control Panel
│   ├── style.css        # Main Styles
│   └── app.js           # Client-side Logic
├── server.js            # Main Backend & API Logic
├── package.json         # Dependencies
└── CoDate.db            # SQLite Database (Auto-generated)
