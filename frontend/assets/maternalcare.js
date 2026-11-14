
const API_URL = "/api/maternal";
// Browser-local demo identity only; this is NOT authentication or access control.
const PATIENT_ID = (() => {
    let id = localStorage.getItem("maternalDemoPatientId");
    if (!id) {
        id = "demo-" + (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
        localStorage.setItem("maternalDemoPatientId", id);
    }
    return id;
})();

// NAVIGATION
function showSection(section, element) {
    const sections = [
        "dashboard",
        "profile",
        "appointments",
        "health",
        "vaccination",
        "settings"
    ];

    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = id === section ? "block" : "none";
        }
    });

    document.querySelectorAll(".menu a").forEach(a => {
        a.classList.remove("active");
    });

    if (element) {
        element.classList.add("active");
    } else {
        const menuItem = document.querySelector(
            `.menu a[onclick*="'${section}'"]`
        );
        if (menuItem) menuItem.classList.add("active");
    }
}

// PROFILE MODAL
function openModal() {
    document.getElementById("profileModal").style.display = "flex";
    document.getElementById("message").innerText = "";
}

function closeModal() {
    document.getElementById("profileModal").style.display = "none";
}

// SAVE PROFILE
async function saveProfile() {
    const name = document.getElementById("inputName").value.trim();
    const ageValue = document.getElementById("inputAge").value;
    const age = Number(ageValue);
    const lmp = document.getElementById("inputLMP").value;
    const message = document.getElementById("message");

    const saveButton = document.querySelector(
        "#profileModal button[onclick='saveProfile()']"
    );

    if (!name || !ageValue || !lmp) {
        message.innerText = "Please fill all fields.";
        return;
    }

    if (!Number.isInteger(age) || age < 18 || age > 60) {
        message.innerText = "Please enter a valid age.";
        return;
    }

    const start = new Date(lmp + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(start.getTime()) || start > today) {
        message.innerText = "Please enter a valid past LMP date.";
        return;
    }

    try {
        message.innerText = "Saving profile...";

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.innerText = "Saving...";
        }

        const response = await fetch(API_URL + "/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                patient_id: PATIENT_ID,
                name: name,
                age: age,
                lmp: lmp
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.detail || "Could not save profile."
            );
        }

        const savedProfile = await fetch(
            API_URL + "/" + PATIENT_ID
        );

        if (!savedProfile.ok) {
            throw new Error("Profile saved but could not reload it.");
        }

        const profileData = await savedProfile.json();

        localStorage.setItem(
            "maternalProfile",
            JSON.stringify(profileData)
        );

        updateProfileUI(profileData);

        message.innerText = "Profile updated and saved successfully!";

        setTimeout(closeModal, 1200);

    } catch (error) {
        console.error("Profile save error:", error);
        message.innerText = "Save failed: " + error.message;

    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.innerText = "Save Profile";
        }
    }
}

// UPDATE PROFILE UI
function updateProfileUI(data) {
    const name = data.name || "";
    const age = data.age ?? "";
    const lmp = data.lmp || "";

    const firstName = document.getElementById("userName");
    const profileName = document.getElementById("profileName");
    const pageName = document.getElementById("profilePageName");
    const pageAge = document.getElementById("profilePageAge");

    if (firstName) firstName.innerText = name.split(" ")[0];
    if (profileName) profileName.innerText = name;
    if (pageName) pageName.innerText = name;
    if (pageAge) pageAge.innerText = age;
    document.getElementById("setupProfileButton").style.display = "none";

    document.getElementById("inputName").value = name;
    document.getElementById("inputAge").value = age;
    document.getElementById("inputLMP").value = lmp;

    if (lmp) {
        calculatePregnancy(lmp);
    }
}
function showEmptyPregnancyState() {
    document.getElementById("setupProfileButton").style.display = "inline-block";
    document.getElementById("pregnancyDuration").innerText = "Add your profile to begin";
    document.getElementById("trimester").innerText = "Pregnancy stage";
    document.getElementById("edd").innerText = "Not available";
    document.getElementById("daysLeft").innerText = "Your dates will appear here after setup.";
    document.getElementById("progressText").innerText = "Progress unavailable";
    document.getElementById("circlePercent").innerText = "—";
    document.getElementById("weekNumber").innerText = "—";
    document.getElementById("timelineWeek").innerText = "—";
    document.getElementById("milestoneText").innerText = "Add your profile to see a general pregnancy-stage overview.";
    document.getElementById("progressBar").style.width = "0%";
    document.querySelector(".circle").style.background = "conic-gradient(#e4e9ec 0% 100%)";
}

// LOAD PROFILE
async function loadProfile() {
    try {
        const response = await fetch(
            API_URL + "/" + PATIENT_ID
        );

        if (response.status === 404) {
            const saved = localStorage.getItem("maternalProfile");

            if (saved) {
                const oldData = JSON.parse(saved);

                const migrate = await fetch(API_URL + "/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        patient_id: PATIENT_ID,
                        name: oldData.name,
                        age: Number(oldData.age),
                        lmp: oldData.lmp
                    })
                });

                if (!migrate.ok) {
                    throw new Error("Could not migrate saved profile.");
                }

                return await loadProfile();
            }

            showEmptyPregnancyState();
            return;
        }

        if (!response.ok) {
            throw new Error("Could not load profile.");
        }

        const data = await response.json();

        localStorage.setItem(
            "maternalProfile",
            JSON.stringify(data)
        );

        updateProfileUI(data);

    } catch (error) {
        console.error("Profile loading error:", error);
        document.getElementById("message").innerText =
            "Could not load profile: " + error.message;
    }
}

// PREGNANCY CALCULATION
function calculatePregnancy(lmp) {
    const start = new Date(lmp + "T00:00:00");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(start.getTime()) || start > today) return;

    const diff = Math.floor(
        (today - start) / (1000 * 60 * 60 * 24)
    );

    const weeks = Math.floor(diff / 7);
    const days = diff % 7;

    const edd = new Date(start);
    edd.setDate(edd.getDate() + 280);

    const percent = Math.min(
        100,
        Math.round((diff / 280) * 100)
    );

    document.getElementById("pregnancyDuration").innerText =
        weeks + " Weeks + " + days + " Days";

    document.getElementById("weekNumber").innerText = weeks;
    document.getElementById("timelineWeek").innerText = weeks;

    document.getElementById("progressText").innerText =
        percent + "% Complete";

    document.getElementById("circlePercent").innerText =
        percent + "%";

    document.getElementById("progressBar").style.width =
        percent + "%";

    document.querySelector(".circle").style.background =
        `conic-gradient(#168f91 0% ${percent}%, #e4e9ec ${percent}% 100%)`;

    document.getElementById("edd").innerText =
        edd.toLocaleDateString("en-US", {
            month: "long",
            day: "2-digit",
            year: "numeric"
        });

    document.getElementById("daysLeft").innerText = diff >= 280
        ? "Estimated due date has passed; please confirm dates with a clinician."
        : Math.max(0, 280 - diff) + " days to estimated due date";
    const milestoneText = weeks < 14
        ? "First trimester: keep routine prenatal care appointments and discuss questions with your care provider."
        : weeks < 28
            ? "Second trimester: continue routine prenatal care and discuss any concerns with your care provider."
            : "Third trimester: continue routine prenatal care and discuss birth planning with your care provider.";
    document.getElementById("milestoneText").innerText = milestoneText;

    let trimester = "First Trimester";
    let trimesterNumber = 1;

    if (weeks >= 14 && weeks < 28) {
        trimester = "Second Trimester";
        trimesterNumber = 2;
    } else if (weeks >= 28) {
        trimester = "Third Trimester";
        trimesterNumber = 3;
    }

    document.getElementById("trimester").innerText = trimester;

    document.querySelector(".center-text").innerHTML =
        `Week <span id="weekNumber">${weeks}</span> | Trimester ${trimesterNumber}`;
}

// SAVE APPOINTMENT
async function saveAppointment() {
    const dateValue =
        document.getElementById("appointmentInput").value;

    const message =
        document.getElementById("appointmentMessage");

    if (!localStorage.getItem("maternalProfile")) {
        message.innerText = "Please set up your profile before adding a reminder.";
        return;
    }

    if (!dateValue) {
        message.innerText = "Please select a date.";
        return;
    }

    const selectedDate = new Date(dateValue + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
        message.innerText = "Please select today or a future date.";
        return;
    }

    try {
        message.innerText = "Saving appointment...";

        const response = await fetch(
            API_URL + "/" + PATIENT_ID + "/appointments",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    appointment_date: dateValue,
                    appointment_reason: "Antenatal Check-up"
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Could not save appointment.");
        }

        message.innerText = "Appointment saved successfully!";

        await loadAppointments();

    } catch (error) {
        console.error("Appointment save error:", error);
        message.innerText = "Backend error: " + error.message;
    }
}

// LOAD APPOINTMENTS
async function loadAppointments() {
    try {
        const response = await fetch(
            API_URL + "/" + PATIENT_ID + "/appointments"
        );

        if (!response.ok) {
            throw new Error("Could not load appointments.");
        }

        const appointments = await response.json();

        const today = new Date().toISOString().slice(0, 10);
        const sortedAppointments = [...appointments].sort((a, b) =>
            a.appointment_date.localeCompare(b.appointment_date)
        );
        const upcoming = sortedAppointments.find(item => item.appointment_date >= today);
        const appointmentDate = document.getElementById("appointmentDate");
        const appointmentList = document.getElementById("appointmentList");
        appointmentList.innerHTML = "";

        if (appointments.length > 0) {
            appointmentDate.innerText = upcoming
                ? upcoming.appointment_date
                : "No upcoming appointment saved.";
            sortedAppointments.forEach(item => {
                const li = document.createElement("li");
                li.textContent = `${item.appointment_date} — ${item.appointment_reason || "Appointment reminder"}`;
                appointmentList.appendChild(li);
            });
        } else {
            appointmentDate.innerText = "No appointment saved yet.";
            appointmentList.innerHTML = "<li>No reminders saved yet.</li>";
        }

    } catch (error) {
        console.error("Appointment loading error:", error);
    }
}

// INITIALIZE
document.addEventListener("DOMContentLoaded", async function () {
    await loadProfile();
    await loadAppointments();
});
