
const API_BASE = "http://127.0.0.1:8000/api/ai";
const PATIENT_ID = "demo-patient-001";


// -------------------------------------------------
// COMMON HELPERS
// -------------------------------------------------

async function apiRequest(url, options = {}) {
    const response = await fetch(API_BASE + url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error("Invalid response from backend.");
    }

    if (!response.ok) {
        let errorMessage = "Request failed.";

        if (typeof data.detail === "string") {
            errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
            errorMessage = data.detail
                .map(item => item.msg || JSON.stringify(item))
                .join(", ");
        } else if (data.detail && typeof data.detail === "object") {
            errorMessage =
                data.detail.message ||
                data.detail.msg ||
                JSON.stringify(data.detail);
        }

        throw new Error(errorMessage);
    }

    return data;
}


function showResult(elementId, message, urgent = false) {
    const box = document.getElementById(elementId);

    if (!box) {
        console.error("Result element not found:", elementId);
        return;
    }

    box.classList.remove("hidden");
    box.replaceChildren();

    const heading = document.createElement("h3");
    heading.textContent = urgent
        ? "Medical attention notice"
        : "AI Response";

    const content = document.createElement("pre");
    content.textContent = message || "No response received from AI.";

    box.append(heading, content);
}


function showLoading(button, loadingText) {
    button.dataset.oldText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
}


function hideLoading(button) {
    button.textContent = button.dataset.oldText || "Submit";
    button.disabled = false;
}


function showError(elementId, error) {
    showResult(
        elementId,
        "Error: " + (error.message || String(error))
    );
}


// -------------------------------------------------
// TAB NAVIGATION
// -------------------------------------------------

document.querySelectorAll(".tab").forEach(button => {
    button.addEventListener("click", async () => {

        document.querySelectorAll(".tab").forEach(tab => {
            tab.classList.remove("active");
        });

        document.querySelectorAll(".feature-section").forEach(section => {
            section.classList.add("hidden");
        });

        button.classList.add("active");

        const sectionId = button.dataset.section;
        document.getElementById(sectionId).classList.remove("hidden");

        if (sectionId === "vaccines") {
            await loadVaccinations();
        }

        if (sectionId === "history") {
            await loadHistory();
        }
    });
});


// -------------------------------------------------
// NUTRITION AI
// -------------------------------------------------

document.getElementById("nutritionForm").addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        const button = document.getElementById("nutritionButton");

        const ageValue = document.getElementById("nutritionAge").value;

        const payload = {
            patient_id: PATIENT_ID,
            age: ageValue ? Number(ageValue) : null,
            pregnancy_week: Number(
                document.getElementById("nutritionWeek").value
            ),
            diet_preference:
                document.getElementById("dietPreference").value,
            allergies:
                document.getElementById("foodAllergies").value.trim() || "None",
            health_conditions:
                document.getElementById("healthConditions").value.trim() || "None"
        };

        showLoading(button, "Generating nutrition plan...");

        try {
            const result = await apiRequest("/nutrition", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            showResult(
                "nutritionResult",
                (result.ai_response || "AI response was empty.") +
                (result.disclaimer ? "\n\n" + result.disclaimer : "")
            );

        } catch (error) {
            showError("nutritionResult", error);

        } finally {
            hideLoading(button);
        }
    }
);


// -------------------------------------------------
// AI SYMPTOM CHECKER
// -------------------------------------------------

document.getElementById("symptomForm").addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        const button = document.getElementById("symptomButton");

        const weekValue = document.getElementById("symptomWeek").value;

        const payload = {
            patient_id: PATIENT_ID,
            pregnancy_week: weekValue ? Number(weekValue) : null,
            symptoms: document.getElementById("symptomText").value.trim(),
            known_conditions:
                document.getElementById("knownConditions").value.trim()
                || "Not provided"
        };

        showLoading(button, "Checking symptoms...");

        try {
            const result = await apiRequest("/symptom-check", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            showResult(
                "symptomResult",
                (result.ai_response || "AI response was empty.") +
                (result.disclaimer ? "\n\n" + result.disclaimer : ""),
                Boolean(result.urgent_warning)
            );

        } catch (error) {
            showError("symptomResult", error);

        } finally {
            hideLoading(button);
        }
    }
);


// -------------------------------------------------
// ADD VACCINATION
// -------------------------------------------------

document.getElementById("vaccineForm").addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        const button = document.getElementById("vaccineButton");

        const status = document.getElementById("vaccineStatus").value;
        const administeredDate =
            document.getElementById("administeredDate").value;

        if (status === "Completed" && !administeredDate) {
            alert("Please enter the administered date.");
            return;
        }

        const payload = {
            patient_id: PATIENT_ID,
            vaccine_name: document.getElementById("vaccineName").value.trim(),
            due_date: document.getElementById("vaccineDueDate").value || null,
            administered_date: administeredDate || null,
            status: status,
            notes: document.getElementById("vaccineNotes").value.trim() || null
        };

        showLoading(button, "Saving...");

        try {
            await apiRequest("/vaccinations", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            document.getElementById("vaccineForm").reset();

            await loadVaccinations();

            alert("Vaccination record saved successfully!");

        } catch (error) {
            alert(error.message);

        } finally {
            hideLoading(button);
        }
    }
);


// -------------------------------------------------
// LOAD VACCINATION RECORDS
// -------------------------------------------------

async function loadVaccinations() {

    const list = document.getElementById("vaccineList");

    if (!list) return;

    list.replaceChildren();

    try {
        const records = await apiRequest(
            "/vaccinations/" + encodeURIComponent(PATIENT_ID)
        );

        if (records.length === 0) {
            const empty = document.createElement("p");
            empty.textContent = "No vaccination records added yet.";
            list.appendChild(empty);
            return;
        }

        records.forEach(record => {

            const card = document.createElement("article");
            card.className = "record-card";

            const title = document.createElement("h3");
            title.textContent = record.vaccine_name;

            const status = document.createElement("span");
            status.className = "status";

            if (record.display_status === "Overdue") {
                status.classList.add("overdue");
            } else if (record.display_status === "Pending") {
                status.classList.add("pending");
            }

            status.textContent = record.display_status;

            const due = document.createElement("p");
            due.textContent = "Due date: " + (record.due_date || "Not entered");

            const given = document.createElement("p");
            given.textContent =
                "Administered date: " +
                (record.administered_date || "Not recorded");

            const notes = document.createElement("p");
            notes.textContent = "Notes: " + (record.notes || "None");

            card.append(title, status, due, given, notes);

            const actions = document.createElement("div");
            actions.className = "record-actions";

            if (record.status !== "Completed") {
                const completeButton = document.createElement("button");
                completeButton.className = "small-btn";
                completeButton.textContent = "Mark Completed";

                completeButton.addEventListener("click", async () => {

                    const today = new Date().toLocaleDateString("en-CA");

                    try {
                        await apiRequest(
                            "/vaccinations/" + record.id,
                            {
                                method: "PUT",
                                body: JSON.stringify({
                                    status: "Completed",
                                    administered_date: today,
                                    notes: record.notes
                                })
                            }
                        );

                        await loadVaccinations();

                    } catch (error) {
                        alert(error.message);
                    }
                });

                actions.appendChild(completeButton);
            }

            const deleteButton = document.createElement("button");
            deleteButton.className = "small-btn";
            deleteButton.textContent = "Delete";

            deleteButton.addEventListener("click", async () => {

                if (!confirm("Delete this vaccination record?")) {
                    return;
                }

                try {
                    await apiRequest(
                        "/vaccinations/" + record.id,
                        { method: "DELETE" }
                    );

                    await loadVaccinations();

                } catch (error) {
                    alert(error.message);
                }
            });

            actions.appendChild(deleteButton);
            card.appendChild(actions);
            list.appendChild(card);
        });

    } catch (error) {
        const message = document.createElement("p");
        message.textContent =
            "Could not load vaccination records: " + error.message;

        list.appendChild(message);
    }
}


// -------------------------------------------------
// LOAD AI HISTORY
// -------------------------------------------------

async function loadHistory() {

    const list = document.getElementById("historyList");

    if (!list) return;

    list.replaceChildren();

    try {
        const records = await apiRequest(
            "/history/" + encodeURIComponent(PATIENT_ID)
        );

        if (records.length === 0) {
            const empty = document.createElement("p");
            empty.textContent = "No previous AI history found.";
            list.appendChild(empty);
            return;
        }

        records.forEach(record => {

            const card = document.createElement("article");
            card.className = "record-card";

            const title = document.createElement("h3");
            title.textContent = record.feature === "nutrition"
                ? "Nutrition AI"
                : "Symptom Checker";

            const dateText = document.createElement("p");
            dateText.textContent = "Date: " + record.created_at;

            const question = document.createElement("p");
            question.textContent = "Your query: " + record.user_input;

            const answer = document.createElement("pre");
            answer.textContent = "AI response:\n" + record.ai_response;

            card.append(title, dateText, question, answer);
            list.appendChild(card);
        });

    } catch (error) {
        const message = document.createElement("p");
        message.textContent =
            "Could not load history: " + error.message;

        list.appendChild(message);
    }
}


// -------------------------------------------------
// REFRESH HISTORY
// -------------------------------------------------

document.getElementById("refreshHistory").addEventListener(
    "click",
    loadHistory
);


// -------------------------------------------------
// INITIAL LOAD
// -------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    loadVaccinations();
});
