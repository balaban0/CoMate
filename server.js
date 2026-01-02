const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;
const db = new Database('CoMate.db');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    handle TEXT UNIQUE NOT NULL,
    display_id INTEGER NOT NULL,
    passcode TEXT NOT NULL, -- Keep for legacy/backup or reusing as the "Matching Answer"
    skills TEXT NOT NULL, -- JSON
    vibe_answers TEXT NOT NULL, -- JSON
    matched_with INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(matched_with) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_a_id INTEGER NOT NULL,
    user_b_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, verified
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_a_id) REFERENCES users(id),
    FOREIGN KEY(user_b_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    short_id TEXT UNIQUE NOT NULL,
    text TEXT NOT NULL,
    options TEXT NOT NULL, -- JSON Array
    sort_order INTEGER DEFAULT 0
  );
`);

// Seed Questions if Empty
const qCount = db.prepare('SELECT COUNT(*) as count FROM questions').get();
if (qCount.count === 0) {
    const SEED_QUESTIONS = [
        {
            id: 'celebrity',
            q: 'Aşağıdakilerden hangisine kendini daha yakın hissediyorsun?',
            options: ['Sedat Peker', 'Acun Ilıcalı', 'Serdar Ortaç', 'Mehmet Şef', 'Seda Sayan', 'Sinan Engin']
        },
        {
            id: 'ex_code',
            q: 'Exine hangi kod dilini öğrenmek zorunda bırakırdın?',
            options: ['Assembly', 'C', 'Java', 'Python', 'Prolog']
        },
        {
            id: 'photo_with',
            q: 'Kimle fotoğraf çekinmek isterdin?',
            options: ['Mükremin', 'Yakışıklı Güvenlik', 'Ömer Kocaman', 'Yılmaz Ar', 'Enes Batur']
        },
        {
            id: 'scroll_time',
            q: 'Günde Kaç saat Kaydırıyorsun?',
            options: ['0-1', '1-3', '3-6', '6-12', 'Ben Hayatsızım']
        },
        {
            id: 'fav_avm',
            q: 'Favori AVM?',
            options: ['Kızılay Avm', 'Ankamall', 'Kentpark', 'Taurus', 'Metromall', 'Armada']
        },
        {
            id: 'assembly_date',
            q: 'Sevgilinin Assembly ile kod yazdığını gördün nasıl tepki verirsin?',
            options: ['Ayrılırım', 'Hayatımın aşkı olduğuna karar veririm', 'Dertlenirim', 'Her yerden engellerim', 'Assembly ne yeniyor mu', 'Sevgili buldum bir de onu mu dert etcem']
        },
        {
            id: 'fav_chips',
            q: 'Favori Cipsin nedir?',
            options: ['Lays', 'Çerezza', 'Ruffles', 'Doritos', 'Patos', 'Diğer']
        },
        {
            id: 'monster_bag',
            q: 'Sırt çantan Monster mı?',
            options: ['Evet', 'Hayır']
        },
        {
            id: 'fav_hobby',
            q: 'Aşağıdakilerden hangisi en çok değer verdiğin hobindir?',
            options: ['Spor yapmak', 'Kod yazmak', 'Oyun oynamak', 'Uyumak', 'Reels kaydırmak', 'Müzik', 'Resim', 'Dizi/Film/Anime izlemek', 'Hobim yok']
        }
    ];

    const insertQ = db.prepare('INSERT INTO questions (short_id, text, options, sort_order) VALUES (?, ?, ?, ?)');
    let order = 0;
    SEED_QUESTIONS.forEach(q => {
        insertQ.run(q.id, q.q, JSON.stringify(q.options), order++);
    });
    console.log("Seeded default questions.");
}

// --- API ROUTES ---

// 1. Stats
app.get('/api/stats', (req, res) => {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const matchCount = db.prepare('SELECT COUNT(*) as count FROM matches').get();
    res.json({ users: userCount.count, matches: matchCount.count });
});

// 2. Register
app.post('/api/register', (req, res) => {
    const { handle, quiz_answers, match_question, match_answer } = req.body;

    // Assign Random 4-digit ID
    const displayId = Math.floor(1000 + Math.random() * 9000);

    // Store match_answer (User's answer to final question) as 'passcode' for storage convenience
    const answer = match_answer || "Cevap Yok";

    const vibes = {
        quiz: quiz_answers || [],
        question: match_question || "Eşleşme Sorusu"
    };

    try {
        const stmt = db.prepare('INSERT INTO users (handle, display_id, passcode, skills, vibe_answers) VALUES (?, ?, ?, ?, ?)');
        const info = stmt.run(handle, displayId, answer, JSON.stringify(["Developer"]), JSON.stringify(vibes));
        res.json({ success: true, userId: info.lastInsertRowid, displayId: displayId });
    } catch (e) {
        console.error("Registration Error:", e);
        res.json({ success: false, error: e.message || 'Handle taken or invalid data' });
    }
});

// 3. Check Status
app.get('/api/status/:userId', (req, res) => {
    const { userId } = req.params;

    // Check match
    const match = db.prepare(`
        SELECT m.*,
    u1.handle as u1_handle, u1.display_id as u1_did, u1.passcode as u1_ans, u1.vibe_answers as u1_vibes,
    u2.handle as u2_handle, u2.display_id as u2_did, u2.passcode as u2_ans, u2.vibe_answers as u2_vibes
        FROM matches m
        JOIN users u1 ON m.user_a_id = u1.id
        JOIN users u2 ON m.user_b_id = u2.id
WHERE(m.user_a_id = ? OR m.user_b_id = ?) AND m.status != 'expired'
    `).get(userId, userId);

    if (match) {
        const isUserA = match.user_a_id == userId;
        const partnerData = isUserA ? {
            handle: match.u2_handle,
            // codeName: match.u2_code,
            displayId: match.u2_did,
            answer: match.u2_ans, // Their answer to the matching question
            vibes: JSON.parse(match.u2_vibes)
        } : {
            handle: match.u1_handle,
            // codeName: match.u1_code,
            displayId: match.u1_did,
            answer: match.u1_ans,
            vibes: JSON.parse(match.u1_vibes)
        };

        // Determine selfData based on whether the current user is userA or userB in the match
        const selfData = isUserA ? {
            handle: match.u1_handle,
            displayId: match.u1_did,
            vibes: JSON.parse(match.u1_vibes)
        } : {
            handle: match.u2_handle,
            displayId: match.u2_did,
            vibes: JSON.parse(match.u2_vibes)
        };

        res.json({
            status: match.status === 'verified' ? 'matched' : 'pending_verification',
            matchId: match.id,
            self: {
                handle: selfData.handle,
                displayId: selfData.displayId,
                vibes: selfData.vibes
            },
            partner: {
                handle: "GİZLİ",
                displayId: partnerData.displayId,
                answer: partnerData.answer,
                question: partnerData.vibes.question || "Soru Yok",
                vibes: partnerData.vibes // Include full vibes for comparison
            }
        });
    } else {
        res.json({ status: 'idle' });
    }
});

// 4. Batch Match (Admin Triggered)
app.post('/api/batch-match', (req, res) => {
    // Get user pool (matched_with IS NULL)
    const candidates = db.prepare(`SELECT * FROM users WHERE matched_with IS NULL`).all();
    console.log(`Batch Match Triggered.Found ${candidates.length} candidates.`);

    if (candidates.length < 2) {
        return res.json({ success: false, message: `Yeterli aday yok. (Bulunan: ${candidates.length})` });
    }

    // Setting up the match matrixes
    let potentialMatches = [];
    for (let i = 0; i < candidates.length; i++) {
        for (let j = i + 1; j < candidates.length; j++) {
            const u1 = candidates[i];
            const u2 = candidates[j];

            // Calculating Scores
            let score = 0;
            try {
                const v1 = JSON.parse(u1.vibe_answers).quiz || {};
                const v2 = JSON.parse(u2.vibe_answers).quiz || {};

                for (const key in v1) {
                    if (v2[key] && v2[key] === v1[key]) score++;
                }
            } catch (e) { }

            potentialMatches.push({ u1, u2, score });
        }
    }

    // Global Optimizasyon - Greedy
    // Big to small 
    potentialMatches.sort((a, b) => b.score - a.score);

    // Matching
    let matchedIds = new Set();
    let matchesCreated = [];

    const makeMatches = db.transaction((matches) => {
        for (const pair of matches) {
            if (!matchedIds.has(pair.u1.id) && !matchedIds.has(pair.u2.id)) {
                // Transaction

                // Update user
                db.prepare('UPDATE users SET matched_with = ? WHERE id = ?').run(pair.u2.id, pair.u1.id);
                db.prepare('UPDATE users SET matched_with = ? WHERE id = ?').run(pair.u1.id, pair.u2.id);

                // Match conceded: status: 'verified'
                db.prepare(`
                    INSERT INTO matches(user_a_id, user_b_id, status)
VALUES(?, ?, 'verified')
                `).run(pair.u1.id, pair.u2.id);

                matchedIds.add(pair.u1.id);
                matchedIds.add(pair.u2.id);

                matchesCreated.push({
                    u1: pair.u1.handle,
                    u2: pair.u2.handle,
                    score: pair.score
                });
            }
        }
    });

    try {
        makeMatches(potentialMatches);
    } catch (e) {
        console.error("Batch match transaction failed:", e);
        return res.json({ success: false, message: "Transaction failed: " + e.message });
    }

    console.log(`Batch Match Complete.Created ${matchesCreated.length} matches.`);

    res.json({
        success: true,
        matches: matchesCreated,
        count: matchesCreated.length,
        unmatched: candidates.length - (matchesCreated.length * 2)
    });
});

// 5. Delete User /Leave Queue
app.post('/api/delete-user', (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.json({ success: false });

    // Remove from users
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    // Remove from matches if pending/verified
    db.prepare("DELETE FROM matches WHERE (user_a_id = ? OR user_b_id = ?)").run(userId, userId);

    console.log(`Deleted User ${userId} `);
    res.json({ success: true });
});

// 6. Verify / Guess Partner ID
app.post('/api/verify', (req, res) => {
    const { userId, code } = req.body; // code is the GUESSED ID
    const guessedId = Number(code);
    console.log(`[VERIFY] Request from User ${userId} with code ${code}`);

    const match = db.prepare(`
        SELECT m.*, u1.display_id as u1_did, u2.display_id as u2_did, u1.id as u1_real_id, u2.id as u2_real_id
        FROM matches m
        JOIN users u1 ON m.user_a_id = u1.id
        JOIN users u2 ON m.user_b_id = u2.id
        WHERE (m.user_a_id = ? OR m.user_b_id = ?) AND m.status != 'expired'
    `).get(userId, userId);

    if (!match) {
        console.log(`[VERIFY] No match found for User ${userId}`);
        return res.json({ success: false, message: 'No match found' });
    }

    const isUserA = match.user_a_id == userId;
    // verify if the code matches the partners' display ID
    const partnerDisplayId = isUserA ? match.u2_did : match.u1_did;

    console.log(`[VERIFY] Match Found. User is ${isUserA ? 'A' : 'B'}. Partner Display ID: ${partnerDisplayId} (Type: ${typeof partnerDisplayId}). Submitted Code: ${code} (Type: ${typeof code})`);

    // To avoid int str collision convert bot to string and trim
    const codeStr = String(code).trim();
    const partnerStr = String(partnerDisplayId).trim();

    if (codeStr === partnerStr) {
        // correct guess
        console.log(`[VERIFY] Success!`);
        res.json({ success: true });
    } else {
        console.log(`[VERIFY] Failed. '${codeStr}' !== '${partnerStr}'`);
        // Reveal the entered id to debug
        res.json({ success: false, message: `Yanlış ID! Girilen: '${codeStr}'` });
    }
});

// 7.Questions API
// get all
app.get('/api/questions', (req, res) => {
    const questions = db.prepare('SELECT * FROM questions ORDER BY sort_order ASC').all();
    // Parse options JSON
    const parsed = questions.map(q => ({
        ...q,
        options: JSON.parse(q.options)
    }));
    res.json(parsed);
});

// create
app.post('/api/admin/questions', (req, res) => {
    const { short_id, text, options, sort_order } = req.body;
    try {
        const stmt = db.prepare('INSERT INTO questions (short_id, text, options, sort_order) VALUES (?, ?, ?, ?)');
        stmt.run(short_id, text, JSON.stringify(options), sort_order || 0);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// update
app.put('/api/admin/questions/:id', (req, res) => {
    const { id } = req.params;
    const { short_id, text, options, sort_order } = req.body;
    try {
        const stmt = db.prepare('UPDATE questions SET short_id = ?, text = ?, options = ?, sort_order = ? WHERE id = ?');
        stmt.run(short_id, text, JSON.stringify(options), sort_order, id);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// delete
app.delete('/api/admin/questions/:id', (req, res) => {
    const { id } = req.params;
    try {
        db.prepare('DELETE FROM questions WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`CoDate running at http://localhost:${port}`);
});

