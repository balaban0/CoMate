##  CoMate
**CoMate** is an interactive web application designed to break the ice at parties and gatherings. Users answer a set of personality or preference questions and are algorithmically matched with other guests. The goal is to encourage attendees to mingle, converse, and find their "hidden matches" before the results are revealed at the end of the event. CoDate creates an environment where conversations start easier, boosting the general morale of the gathering.

##  Features

* **Real-Time Questionnaire:** Dynamic, engaging questions rendered instantly for guests.
* **Global Greedy Optimization:** A custom algorithm that ensures the highest "global happiness" for the group rather than just individual matches.
* **Verification System:** Users verify their match by exchanging unique IDs/Code Names in real life.
* **Mobile-First Design:** Responsive UI designed to be used on phones while mingling.
* **Admin Dashboard:** Tools for the host to manage questions, trigger the batch matching process, and reset the event.

##  The Matching Algorithm

CoMate uses a unique **Global Greedy Optimization** approach located in `/api/batch-match` to ensure fair and high-quality pairs.

1.  **Candidate Selection:** The system fetches all currently unmatched users.
2.  **Compatibility Matrix:** It performs a pairwise comparison of every user against every other user.
3.  **Scoring:** A compatibility score is calculated based on identical quiz answers (e.g., both choosing "Java" = +1 point).
4.  **Greedy Selection:**
    * All possible pairs are generated and sorted by score (Highest to Lowest).
    * The algorithm iterates through the list, locking in the highest-scoring pairs first.
    * Once a user is matched, they are removed from the pool to prevent double-booking.

*Why Greedy Selection matters:* This method prioritizes the group's overall compatibility score, finding the best possible couples across the entire gathering.

##  Tech Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
* **Backend:** Node.js, Express.js
* **Database:** SQLite (via `better-sqlite3`) for fast, zero-configuration storage.
* **Utilities:** `cors` for middleware, `body-parser` for JSON handling.

##  Project Structure
```text
/codate
├── public/              
│   ├── index.html       
│   ├── admin.html       
│   ├── style.css       
│   └── app.js           
├── server.js            
├── package.json         
└── CoMate.db            #Auto-Generated when server is run
```

## Getting Started

These are the steps to set up the project locally on your machine.

### Prerequisites

* **Node.js** (v14 or higher)
* **npm** (This usually comes installed with Node.js)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/balaban0/CoMate.git
    cd CoDate
    ```

2.  **Install dependencies**
    This will install all required packages listed in `package.json` (like `express` and `better-sqlite3`).
    ```bash
    npm install
    ```

3.  **Start the server**
    ```bash
    node server.js
    ```
    *Note: On the first run, the application will automatically create the `CoMate.db` database file and populate it with default questions.*

4.  **Access the App**
    Open your browser and navigate to:
    ```text
    http://localhost:3000
    ```
### How to run for a Party (Local Network)
To let other people join from their phones while you host:

1.  Connect your computer and the phones to the **same Wi-Fi network**.
2.  Find your computer's **Local IP Address**:
    * **Windows:** Open Command Prompt and type `ipconfig`. Look for "IPv4 Address" (e.g., `192.168.1.15`).
    * **Mac/Linux:** Open Terminal and type `ifconfig` (or `ip a`). Look for `inet` under `en0` or `wlan0`.
3.  Tell your guests to visit that IP address with the port number:
    ```text
    [http://192.168.1.15:3000](http://192.168.1.15:3000)
    ```
    
## Usage Guide

### For the Host (Admin)
1.  **Navigate to the Admin Panel**
    Go to `/admin.html` (e.g., `http://localhost:3000/admin.html`).
2.  **Seed Questions**
    Ensure the question database is populated.
3.  **Wait for Guests**
    Let users register and answer questions via the main page.
4.  **Trigger Match**
    Click the "Batch Match" button when everyone is ready.

### For Guests
1.  **Visit the Main Page**
    Open the app on your phone.
2.  **Vibe Check**
    Enter a Handle/Name and answer the "Vibe Check" questions.
3.  **Wait for Results**
    Wait for the host to announce that matches are ready.
4.  **Find & Verify**
    Find your partner in the room and enter their specific **Display ID** to verify the match!
