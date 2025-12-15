const state = {
    userId: localStorage.getItem('codate_user_id'),
    form: {
        handle: '',
        quiz_answers: {},
        currentQuestionIndex: 0
    },
    questions: [], // Fetched from API
    polling: null
};

// --- UI HELPERS ---

// --- UI HELPERS ---
const ui = {
    showSection: (id) => {
        document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('section').forEach(el => el.classList.remove('active'));
        const target = document.getElementById(id);
        target.classList.remove('hidden');
        target.classList.add('active');
    },

    showStep: (id) => {
        document.querySelectorAll('.wizard-step').forEach(el => el.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
    },

    renderQuiz: () => {
        const qIndex = state.form.currentQuestionIndex;
        // Updated to use state.questions
        if (qIndex >= state.questions.length) {
            ui.showStep('step-match-question');
            return;
        }

        const q = state.questions[qIndex];

        // Update Progress
        const percent = ((qIndex) / state.questions.length) * 100;
        document.getElementById('quiz-progress').style.width = `${percent}%`;

        document.getElementById('quiz-question-text').innerText = q.text; // Updated from q.q to q.text
        const container = document.getElementById('quiz-options');

        // Generate Options HTML
        let html = q.options.map(opt => `
            <button type="button" class="quiz-option" onclick="app.answerQuiz('${q.short_id}', '${opt}')">${opt}</button>
        `).join(''); // q.id -> q.short_id

        // Add Back Button
        html += `
            <button type="button" class="quiz-option btn-secondary-outline" onclick="app.prevQuestion()" 
                style="grid-column: 1 / -1; margin-top: 10px; opacity: 0.7;">
                ← Geri
            </button>
        `;

        container.innerHTML = html;
    }
};

const app = {
    init: async () => {
        // Fetch Questions First
        try {
            state.questions = await fetch('/api/questions').then(r => r.json());
        } catch (e) {
            alert("Could not load questions: " + e.message);
            return;
        }

        if (state.userId) {
            app.goToDashboard();
        } else {
            ui.showSection('section-register');
            ui.showStep('step-handle');
        }

        // Listeners
        document.getElementById('btn-start-quiz').onclick = app.startQuiz;

        document.getElementById('registerForm').onsubmit = async (e) => {
            e.preventDefault();
            await app.register();
        };

        // document.getElementById('btn-find-match').onclick = app.findMatch;
        document.getElementById('btn-verify').onclick = app.verify;
    },

    startQuiz: () => {
        const handle = document.getElementById('reg-handle').value;
        if (!handle.trim()) return alert("Kullanıcı Adı Gerekli");
        state.form.handle = handle;
        state.form.currentQuestionIndex = 0;

        ui.showStep('step-quiz');
        ui.renderQuiz();
    },

    answerQuiz: (qId, answer) => {
        state.form.quiz_answers[qId] = answer;
        state.form.currentQuestionIndex++;
        ui.renderQuiz();
    },

    prevQuestion: () => {
        if (state.form.currentQuestionIndex > 0) {
            state.form.currentQuestionIndex--;
            ui.renderQuiz();
        } else {
            // If at first question, go back to Handle
            ui.showStep('step-handle');
        }
    },

    register: async () => {
        const matchQuestion = document.getElementById('reg-match-question-input').value;
        const matchAnswer = document.getElementById('reg-match-answer').value;
        if (!matchQuestion) return alert("Lütfen sorunuzu yazın.");
        if (!matchAnswer) return alert("Lütfen cevabınızı yazın.");

        const payload = {
            handle: state.form.handle,
            quiz_answers: state.form.quiz_answers,
            match_question: matchQuestion,
            match_answer: matchAnswer
        };

        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(r => r.json());

        if (res.success) {
            localStorage.setItem('codate_user_id', res.userId);
            localStorage.setItem('codate_display_id', res.displayId);
            localStorage.setItem('codate_handle', state.form.handle);
            state.userId = res.userId;

            app.goToDashboard();
            document.getElementById('display-handle').innerText = state.form.handle;
            document.getElementById('my-id-display').innerText = `ID: ${res.displayId}`;
        } else {
            alert("Hata: " + res.error);
        }
    },

    goToDashboard: () => {
        ui.showSection('section-dashboard');
        app.startPolling();

        // Restore from LocalStorage if needed
        const storedDisplayId = localStorage.getItem('codate_display_id');

        if (storedDisplayId) document.getElementById('my-id-display').innerText = `ID: ${storedDisplayId}`;
        const storedHandle = localStorage.getItem('codate_handle');
        if (storedHandle) document.getElementById('display-handle').innerText = storedHandle;
    },

    startPolling: () => {
        if (app.pollInterval) clearInterval(app.pollInterval);
        app.pollInterval = setInterval(async () => {
            const res = await fetch(`/api/status/${state.userId}`).then(r => r.json());

            if (res.status === 'idle') {
                document.getElementById('match-status-text').innerHTML = "Vibe Shift Bekleniyor...<br><span style='font-size: 0.8em; opacity: 0.7;'>Admin'in eşleşmeleri başlatmasını bekle.</span>";
                document.getElementById('match-reveal').classList.add('hidden');

                const btnLeave = document.getElementById('btn-leave-queue');
                if (btnLeave) btnLeave.classList.remove('hidden');

            } else if (res.status === 'pending_verification' || res.status === 'matched') {
                // With the new flow, status might be 'verified' (matched) but UI treats it as verify step
                // Server returns 'matched' if verified. In batch match we set 'verified'.
                // So this block handles the "Reveal Code Name" phase.

                const btnLeave = document.getElementById('btn-leave-queue');
                if (btnLeave) btnLeave.classList.add('hidden');

                document.getElementById('match-status-text').innerText = "EŞLEŞME BULUNDU!";
                document.getElementById('match-reveal').classList.remove('hidden');

                // Show Partner Info
                // Partner ID display removed from UI
                // document.getElementById('partner-id-display').innerText = res.partner.displayId || "????";
                document.getElementById('partner-question-label').innerText = res.partner.question || "Gizli Soru";
                document.getElementById('partner-answer').innerText = `"${res.partner.answer || '...'}"`;
            }
        }, 3000);
    },

    stopPolling: () => {
        if (state.polling) clearInterval(state.polling);
        state.polling = null;
    },

    findMatch: async () => {
        const res = await fetch('/api/find-match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.userId })
        }).then(r => r.json());
        if (!res.success) alert(res.message);
    },

    verify: async () => {
        const input = document.getElementById('verify-input').value;
        if (!input) return alert("Lütfen ID giriniz");

        const res = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.userId, code: input })
        }).then(r => r.json());

        if (res.success) {
            // Fetch Full Data using Status Endpoint
            // We assume backend status is updated or we just rely on next poll?
            // Actually, /api/verify just checks. We need to fetch data.
            // Let's force a fetch.
            const statusRes = await fetch(`/api/status/${state.userId}`).then(r => r.json());

            if (statusRes.status === 'matched') {
                // alert("Eşleşme Doğru! Yönlendiriliyorsunuz..."); REMOVED for smoother flow
                app.showMatchSuccess(statusRes);
            } else {
                // Fallback if status not yet updated or something (though it should be 'matched' if verified)
                alert("Eşleşme Doğru! Lütfen bekleyin...");
            }
        } else {
            alert("Doğrulama Başarısız: " + res.message);
        }
    },

    showMatchSuccess: (data) => {
        ui.showSection('section-match-success');
        app.stopPolling();

        const container = document.getElementById('match-comparison-body');
        container.innerHTML = '';

        const selfQuiz = data.self.vibes.quiz || {};
        const partnerQuiz = data.partner.vibes.quiz || {};

        state.questions.forEach(q => {
            const myAns = selfQuiz[q.short_id]; // q.id -> q.short_id
            const pAns = partnerQuiz[q.short_id];

            const isMatch = myAns === pAns;
            const rowClass = isMatch ? 'match-row' : '';

            const html = `
                <tr class="${rowClass}">
                    <td class="question-cell">${q.text}</td> <!-- q.q -> q.text -->
                    <td class="answer-cell self">${myAns || '-'}</td>
                    <td class="answer-cell partner">${pAns || '?'}</td>
                    <td class="status-cell">${isMatch ? '❤️' : '⚡'}</td>
                </tr>
            `;
            container.innerHTML += html;
        });
    },

    leaveQueue: async () => {
        if (!state.userId) return;

        await fetch('/api/delete-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.userId })
        });

        localStorage.removeItem('codate_user_id');
        localStorage.removeItem('codate_passcode');
        location.reload();
    },

    logout: () => {
        localStorage.removeItem('codate_user_id');
        localStorage.removeItem('codate_passcode');
        location.reload();
    }
};

window.onload = app.init;

// Handle Tab Close / Navigation Exit
window.addEventListener('pagehide', () => {
    if (state.userId && document.getElementById('section-dashboard').classList.contains('active')) {
        // Use sendBeacon for reliable delivery during unload
        const data = JSON.stringify({ userId: state.userId });
        navigator.sendBeacon('/api/delete-user', new Blob([data], { type: 'application/json' }));
    }
});
