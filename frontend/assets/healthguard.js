document.addEventListener("DOMContentLoaded", function () {

    const symptomButtons = document.querySelectorAll(".hg-symptom");
    const selectedList = document.getElementById("hgSelectedList");
    const selectedArea = document.getElementById("hgSelectedArea");
    const duration = document.getElementById("hgDuration");
    const severity = document.getElementById("hgSeverity");
    const severityValue = document.getElementById("hgSeverityValue");
    const customSymptoms = document.getElementById("hgCustomSymptoms");

    const followupSection = document.getElementById("hgFollowupSection");
    const followupQuestions = document.getElementById("hgFollowupQuestions");
    const analyzeBtn = document.getElementById("hgAnalyzeBtn");
    const error = document.getElementById("hgError");

    const reportSection = document.getElementById("hgReportSection");
    const reportContent = document.getElementById("hgReportContent");
    const downloadBtn = document.getElementById("hgDownloadBtn");

    const startBtn = document.getElementById("startScreeningBtn");

    let selectedSymptoms = [];

    // Follow-up questions for each symptom
    const questions = {
        "Fever": [
            { q: "How long have you had fever?", a: ["Less than 1 day", "1–3 days", "4–7 days", "More than a week"] },
            { q: "Do you have chills or shivering?", a: ["Yes", "No"] },
            { q: "Do you have a skin rash?", a: ["Yes", "No"] }
        ],
        "Headache": [
            { q: "Where is your headache?", a: ["Forehead", "One side", "Back of head", "Whole head"] },
            { q: "How did it start?", a: ["Suddenly", "Gradually"] },
            { q: "Do you have blurred vision or weakness?", a: ["Yes", "No"] },
            { q: "Is this the worst or most sudden headache you have experienced?", a: ["Yes", "No"] }
        ],
        "Stomach Pain": [
            { q: "Where is the pain?", a: ["Upper abdomen", "Lower abdomen", "Right side", "Left side", "Around the navel", "Whole abdomen"] },
            { q: "What type of pain is it?", a: ["Cramping", "Burning", "Sharp", "Dull"] },
            { q: "Do you have vomiting or loose motions?", a: ["Yes", "No"] },
            { q: "Is the pain sudden or severe?", a: ["Yes", "No"] },
            { q: "Have you noticed blood in vomit or stool?", a: ["Yes", "No"] }
        ],
        "Cough": [
            { q: "What type of cough do you have?", a: ["Dry", "With mucus"] },
            { q: "How long have you had cough?", a: ["Less than 3 days", "3–7 days", "More than a week"] },
            { q: "Do you have fever?", a: ["Yes", "No"] },
            { q: "Do you have difficulty breathing?", a: ["Yes", "No"] }
        ],
        "Body Pain": [
            { q: "Where do you feel pain?", a: ["Muscles", "Joints", "Back", "Whole body"] },
            { q: "Did the pain start after an injury?", a: ["Yes", "No"] },
            { q: "Is there swelling?", a: ["Yes", "No"] }
        ],
        "Fatigue": [
            { q: "How long have you felt tired?", a: ["1–2 days", "3–7 days", "More than a week"] },
            { q: "Are you experiencing dizziness?", a: ["Yes", "No"] },
            { q: "Has your appetite changed?", a: ["Decreased", "Increased", "No change"] }
        ],
        "Chest Pain": [
            { q: "What does the chest pain feel like?", a: ["Pressure or heaviness", "Sharp pain", "Burning", "Other"] },
            { q: "Does pain spread to your arm, jaw or back?", a: ["Yes", "No"] },
            { q: "Do you have sweating, breathlessness or faintness with the pain?", a: ["Yes", "No"] }
        ],
        "Breathing Difficulty": [
            { q: "When do you experience breathing difficulty?", a: ["At rest", "During activity", "While sleeping"] },
            { q: "Can you speak full sentences comfortably?", a: ["Yes", "No"] },
            { q: "Do you have chest pain or confusion?", a: ["Yes", "No"] },
            { q: "Are your lips turning blue or grey?", a: ["Yes", "No"] }
        ]
    };

    // Select or deselect symptoms
    symptomButtons.forEach(button => {
        button.addEventListener("click", function () {
            const symptom = this.dataset.symptom;

            if (selectedSymptoms.includes(symptom)) {
                selectedSymptoms = selectedSymptoms.filter(item => item !== symptom);
                this.classList.remove("selected");
            } else {
                selectedSymptoms.push(symptom);
                this.classList.add("selected");
            }

            updateSelectedSymptoms();
        });
    });

    function updateSelectedSymptoms() {
        selectedList.innerHTML = "";
        selectedSymptoms.forEach(symptom => {
            const tag = document.createElement("span");
            tag.textContent = symptom;
            selectedList.appendChild(tag);
        });

        selectedArea.hidden = selectedSymptoms.length === 0;
    }

    // Severity slider
    if (severity && severityValue) {
        severity.addEventListener("input", function () {
            severityValue.textContent = this.value + "/10";
        });
    }

    // Start screening button
    if (startBtn) {
        startBtn.addEventListener("click", function () {
            document.getElementById("screening")?.scrollIntoView({ behavior: "smooth" });
        });
    }

    // Generate follow-up questions
    function generateQuestions() {
        followupQuestions.innerHTML = "";

        selectedSymptoms.forEach((symptom, index) => {
            const heading = document.createElement("h3");
            heading.textContent = symptom + " - Follow-up Questions";
            followupQuestions.appendChild(heading);

            (questions[symptom] || []).forEach((item, questionIndex) => {
                const wrapper = document.createElement("div");
                wrapper.className = "hg-question";

                const label = document.createElement("label");
                label.textContent = item.q;

                const select = document.createElement("select");
                select.dataset.symptom = symptom;
                select.dataset.question = questionIndex;
                select.required = true;

                const placeholder = document.createElement("option");
                placeholder.value = "";
                placeholder.textContent = "Select your answer";
                select.appendChild(placeholder);

                item.a.forEach(answer => {
                    const option = document.createElement("option");
                    option.value = answer;
                    option.textContent = answer;
                    select.appendChild(option);
                });

                wrapper.appendChild(label);
                wrapper.appendChild(select);
                followupQuestions.appendChild(wrapper);
            });
        });
    }

    // Analyze button first displays questions
    analyzeBtn.addEventListener("click", function () {
        error.textContent = "";

        if (selectedSymptoms.length === 0) {
            error.textContent = "Please select at least one symptom.";
            return;
        }

        if (!duration.value) {
            error.textContent = "Please select how long you have had symptoms.";
            return;
        }

        if (severity.value === "") {
            error.textContent = "Please select your symptom severity.";
            return;
        }

        if (followupSection.hidden) {
            generateQuestions();
            followupSection.hidden = false;
            followupSection.scrollIntoView({ behavior: "smooth" });
            analyzeBtn.textContent = "Generate My Screening Report →";
            return;
        }

        const selects = followupQuestions.querySelectorAll("select");
        const answers = [];

        for (const select of selects) {
            if (!select.value) {
                error.textContent = "Please answer all follow-up questions.";
                select.focus();
                return;
            }

            const symptom = select.dataset.symptom;
            const index = Number(select.dataset.question);

            answers.push({
                symptom: symptom,
                question: questions[symptom][index].q,
                answer: select.value
            });
        }

        generateReport(answers);
    });

   
function generateReport(answers) {
    reportContent.innerHTML = "";

    // Identify emergency warning signs
    const emergencyQuestions = [
        "spread to your arm",
        "sweating, breathlessness",
        "full sentences",
        "chest pain or confusion",
        "lips turning blue",
        "worst or most sudden headache",
        "blood in vomit or stool",
        "sudden or severe"
    ];

    const redFlags = answers.filter(item =>
        item.answer === "Yes" &&
        emergencyQuestions.some(flag =>
            item.question.includes(flag)
        )
    );

    const emergency = redFlags.length > 0;

    // Calculate prototype screening priority score
    const severityScore = Math.min(
        50,
        Math.max(0, Number(severity.value) || 0) * 5
    );

    const durationText = (duration.value || "").toLowerCase();
    let durationScore = 5;

    if (durationText.includes("more than a week")) {
        durationScore = 20;
    } else if (durationText.includes("4–7") ||
               durationText.includes("4-7")) {
        durationScore = 15;
    } else if (durationText.includes("3–7") ||
               durationText.includes("3-7")) {
        durationScore = 12;
    } else if (durationText.includes("1–3") ||
               durationText.includes("1-3")) {
        durationScore = 8;
    } else if (durationText.includes("less than 1 day") ||
               durationText.includes("less than 3 days")) {
        durationScore = 3;
    }

    const symptomScore = Math.min(
        15,
        selectedSymptoms.length * 3
    );

    let riskScore = Math.min(
        100,
        severityScore + durationScore + symptomScore
    );

    // Emergency warning signs override the numerical score
    if (emergency) {
        riskScore = 100;
    }

    let riskLevel;
    let actionMessage;
    let actionDetails;

    if (emergency) {
        riskLevel = "EMERGENCY";
        actionMessage = "SEEK EMERGENCY MEDICAL HELP NOW.";
        actionDetails = [
            "Go to the nearest emergency department immediately.",
            "Call your local emergency number (112 in India) if needed.",
            "Do not drive yourself if you feel faint or seriously unwell.",
            "Do not wait for this app or a routine doctor appointment."
        ];
    } else if (riskScore >= 60) {
        riskLevel = "HIGH PRIORITY";
        actionMessage = "GET A MEDICAL ASSESSMENT TODAY.";
        actionDetails = [
            "Contact a qualified doctor today.",
            "If symptoms become severe or suddenly worsen, seek emergency care.",
            "Share your answers and this report with the doctor."
        ];
    } else if (riskScore >= 30) {
        riskLevel = "MODERATE PRIORITY";
        actionMessage = "ARRANGE A DOCTOR CONSULTATION SOON.";
        actionDetails = [
            "Arrange a consultation with a General Physician soon.",
            "Monitor your symptoms and note any changes.",
            "Seek urgent care if warning signs develop."
        ];
    } else {
        riskLevel = "LOWER SCREENING PRIORITY";
        actionMessage = "MONITOR YOUR SYMPTOMS AND SEEK MEDICAL ADVICE IF THEY PERSIST.";
        actionDetails = [
            "Monitor your symptoms and take adequate rest.",
            "Consult a General Physician if symptoms persist or concern you.",
            "Seek urgent care if symptoms become severe or warning signs appear."
        ];
    }

    // Chest pain and breathing difficulty need prompt assessment
    if (!emergency &&
        (selectedSymptoms.includes("Chest Pain") ||
         selectedSymptoms.includes("Breathing Difficulty"))) {
        actionMessage = "GET PROMPT MEDICAL ASSESSMENT TODAY.";
        actionDetails.unshift(
            "Because you reported chest pain or breathing difficulty, get assessed by a qualified medical professional today."
        );
    }

    // Report helper functions
    function addHeading(text) {
        const h = document.createElement("h3");
        h.textContent = text;
        reportContent.appendChild(h);
    }

    function addParagraph(text) {
        const p = document.createElement("p");
        p.textContent = text;
        reportContent.appendChild(p);
    }

    function addBoldAction(title, message) {
        const box = document.createElement("div");
        box.className = "hg-report-warning";

        const strong = document.createElement("strong");
        strong.textContent = title;

        const p = document.createElement("p");
        p.textContent = message;

        box.appendChild(strong);
        box.appendChild(p);
        reportContent.appendChild(box);
    }

    function addList(items) {
        const ul = document.createElement("ul");

        items.forEach(item => {
            const li = document.createElement("li");
            li.textContent = item;
            ul.appendChild(li);
        });

        reportContent.appendChild(ul);
    }

    // Report title
    addHeading("1. PATIENT SYMPTOM SUMMARY");
    addParagraph("Selected symptoms: " + selectedSymptoms.join(", "));
    addParagraph("Duration: " + duration.value);
    addParagraph("Severity: " + severity.value + "/10");
    addParagraph(
        "Additional symptoms: " +
        (customSymptoms.value.trim() || "None provided")
    );

    // Risk score section
    addHeading("2. RISK SCORE ANALYSIS");

    const scoreBox = document.createElement("div");
    scoreBox.className = emergency
        ? "hg-report-warning"
        : "hg-report-safe";

    const scoreTitle = document.createElement("h2");
    scoreTitle.textContent = riskScore + " / 100";

    const scoreLabel = document.createElement("strong");
    scoreLabel.textContent = riskLevel;

    const scoreDescription = document.createElement("p");
    scoreDescription.textContent =
        "This is a prototype screening priority score, not a medical diagnosis or probability of disease.";

    scoreBox.appendChild(scoreTitle);
    scoreBox.appendChild(scoreLabel);
    scoreBox.appendChild(scoreDescription);
    reportContent.appendChild(scoreBox);

    addParagraph(
        "Severity contribution: " + severityScore + " / 50"
    );

    addParagraph(
        "Duration contribution: " + durationScore + " / 20"
    );

    addParagraph(
        "Number of symptoms contribution: " + symptomScore + " / 15"
    );

    if (emergency) {
        addParagraph(
            "Emergency override applied because a potentially serious warning sign was reported."
        );
    }

    // Clear action plan
    addHeading("3. WHAT SHOULD YOU DO NOW?");

    addBoldAction("IMPORTANT ACTION:", actionMessage);
    addList(actionDetails);

    // Follow-up answers
    addHeading("4. FOLLOW-UP QUESTION ANALYSIS");

    answers.forEach(item => {
        addParagraph(
            item.symptom + ": " +
            item.question + " — " + item.answer
        );
    });

    // Warning signs
    addHeading("5. WARNING SIGN ANALYSIS");

    if (emergency) {
        addParagraph(
            "The following answers require urgent medical attention:"
        );

        addList(redFlags.map(item => item.question));
    } else {
        addParagraph(
            "No emergency warning sign was identified by the answers in this questionnaire. This does not rule out a serious medical condition."
        );
    }

    // Doctor recommendation
    addHeading("6. RECOMMENDED DOCTOR");

    if (emergency) {
        addBoldAction(
            "RECOMMENDED CARE:",
            "Nearest Emergency Department / Emergency Medical Service."
        );
    } else if (
        selectedSymptoms.includes("Chest Pain") ||
        selectedSymptoms.includes("Breathing Difficulty")
    ) {
        addBoldAction(
            "RECOMMENDED CARE:",
            "Prompt assessment by a qualified doctor today. Emergency evaluation if symptoms are severe or worsening."
        );
    } else {
        addBoldAction(
            "FIRST DOCTOR TO CONSULT:",
            "General Physician. They can examine you and refer you to a specialist if required."
        );
    }

    // Final disclaimer and report date
    addHeading("7. IMPORTANT NOTE");

    addParagraph(
        "This report provides preliminary symptom-screening guidance only. It cannot confirm or rule out a disease. A qualified healthcare professional must evaluate the patient."
    );

    addParagraph(
        "Report generated: " + new Date().toLocaleString()
    );

    reportSection.hidden = false;
    reportSection.scrollIntoView({ behavior: "smooth" });
}


    // Print / save report as PDF
    downloadBtn.addEventListener("click", function () {
        window.print();
    });

});

// ===============================
// HEALTHGUARD LANGUAGE SYSTEM
// English and Hindi
// ===============================

document.addEventListener("DOMContentLoaded", function () {

    const languageSelect = document.getElementById("hgLanguage");

    if (!languageSelect) return;

    const translations = {
        en: {
            "EMERGENCY SAFETY APP": "EMERGENCY SAFETY APP",
            "HealthGuard": "HealthGuard",
            "Welcome to HealthGuard": "Welcome to HealthGuard",
            "Choose your symptoms": "Choose your symptoms",
            "Fever": "Fever",
            "Headache": "Headache",
            "Stomach Pain": "Stomach Pain",
            "Cough": "Cough",
            "Body Pain": "Body Pain",
            "Fatigue": "Fatigue",
            "Chest Pain": "Chest Pain",
            "Breathing Difficulty": "Breathing Difficulty",
            "Any other symptoms?": "Any other symptoms?",
            "Describe anything else you are experiencing.": "Describe anything else you are experiencing.",
            "Analyze My Report →": "Analyze My Report →",
            "Tell us more about your symptoms": "Tell us more about your symptoms",
            "Please answer these questions to help us understand your symptoms better.": "Please answer these questions to help us understand your symptoms better.",
            "HealthGuard Screening Report": "HealthGuard Screening Report",
            "Print / Save as PDF": "Print / Save as PDF",
            "1. PATIENT SYMPTOM SUMMARY": "1. PATIENT SYMPTOM SUMMARY",
            "2. RISK SCORE ANALYSIS": "2. RISK SCORE ANALYSIS",
            "3. WHAT SHOULD YOU DO NOW?": "3. WHAT SHOULD YOU DO NOW?",
            "4. FOLLOW-UP QUESTION ANALYSIS": "4. FOLLOW-UP QUESTION ANALYSIS",
            "5. WARNING SIGN ANALYSIS": "5. WARNING SIGN ANALYSIS",
            "6. RECOMMENDED DOCTOR": "6. RECOMMENDED DOCTOR",
            "7. IMPORTANT NOTE": "7. IMPORTANT NOTE",
            "EMERGENCY": "EMERGENCY",
            "HIGH PRIORITY": "HIGH PRIORITY",
            "MODERATE PRIORITY": "MODERATE PRIORITY",
            "LOWER SCREENING PRIORITY": "LOWER SCREENING PRIORITY"
        },

        hi: {
            "EMERGENCY SAFETY APP": "आपातकालीन सुरक्षा ऐप",
            "HealthGuard": "स्वास्थ्य सुरक्षा",
            "Welcome to HealthGuard": "स्वास्थ्य सुरक्षा में आपका स्वागत है",
            "Choose your symptoms": "अपने लक्षण चुनें",
            "Fever": "बुखार",
            "Headache": "सिरदर्द",
            "Stomach Pain": "पेट दर्द",
            "Cough": "खाँसी",
            "Body Pain": "शरीर में दर्द",
            "Fatigue": "थकान",
            "Chest Pain": "सीने में दर्द",
            "Breathing Difficulty": "साँस लेने में परेशानी",
            "Any other symptoms?": "क्या आपको कोई अन्य परेशानी है?",
            "Describe anything else you are experiencing.": "अपनी अन्य परेशानियों के बारे में बताएँ।",
            "Analyze My Report →": "मेरी रिपोर्ट तैयार करें →",
            "Tell us more about your symptoms": "अपने लक्षणों के बारे में और बताएँ",
            "Please answer these questions to help us understand your symptoms better.": "आपकी परेशानी को बेहतर समझने के लिए इन सवालों के जवाब दें।",
            "HealthGuard Screening Report": "स्वास्थ्य जाँच रिपोर्ट",
            "Print / Save as PDF": "प्रिंट करें / PDF सेव करें",
            "1. PATIENT SYMPTOM SUMMARY": "1. मरीज के लक्षणों का विवरण",
            "2. RISK SCORE ANALYSIS": "2. स्वास्थ्य जोखिम का विश्लेषण",
            "3. WHAT SHOULD YOU DO NOW?": "3. अब आपको क्या करना चाहिए?",
            "4. FOLLOW-UP QUESTION ANALYSIS": "4. अतिरिक्त सवालों के जवाब",
            "5. WARNING SIGN ANALYSIS": "5. खतरे के संकेतों का विश्लेषण",
            "6. RECOMMENDED DOCTOR": "6. किस डॉक्टर से मिलें?",
            "7. IMPORTANT NOTE": "7. जरूरी जानकारी",
            "EMERGENCY": "आपातकालीन स्थिति",
            "HIGH PRIORITY": "उच्च प्राथमिकता",
            "MODERATE PRIORITY": "मध्यम प्राथमिकता",
            "LOWER SCREENING PRIORITY": "कम प्राथमिकता"
        }
    };

    // Save original page text
    const originalTexts = new Map();

    function saveOriginalText() {
        document.querySelectorAll("body *").forEach(element => {
            if (
                element.children.length === 0 &&
                element.textContent.trim() !== ""
            ) {
                if (!originalTexts.has(element)) {
                    originalTexts.set(element, element.textContent);
                }
            }
        });
    }

    function changeLanguage(language) {

        const dictionary = translations[language];

        if (!dictionary) return;

        saveOriginalText();

        originalTexts.forEach((originalText, element) => {

            const cleanText = originalText.trim();

            if (dictionary[cleanText]) {
                element.textContent =
                    originalText.replace(cleanText, dictionary[cleanText]);
            }

        });

        document.documentElement.lang = language;

        localStorage.setItem("hgLanguage", language);
    }

    // Change language on selection
    languageSelect.addEventListener("change", function () {
        changeLanguage(this.value);
    });

    // Restore previously selected language
    const savedLanguage = localStorage.getItem("hgLanguage") || "en";

    languageSelect.value = savedLanguage;
    changeLanguage(savedLanguage);

});


