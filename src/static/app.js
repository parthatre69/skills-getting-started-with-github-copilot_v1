document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const selectedActivityDiv = document.getElementById("selected-activity");
  const searchInput = document.getElementById("search");

  function avatarUrl(seed, style = "identicon") {
    return `https://api.dicebear.com/6.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
  }

  // Render a single activity card
  function renderActivityCard(name, details) {
    const card = document.createElement("div");
    card.className = "activity-card";
    card.dataset.name = name;

    const spotsLeft = details.max_participants - details.participants.length;

    const avatar = document.createElement("img");
    avatar.className = "avatar";
    avatar.src = avatarUrl(name);
    avatar.alt = `${name} avatar`;

    const content = document.createElement("div");
    content.className = "activity-content";
    content.innerHTML = `
      <h4>${name}</h4>
      <div class="meta">${details.description}</div>
      <div class="meta"><strong>Schedule:</strong> ${details.schedule}</div>
      <div style="margin-top:8px;"><span class="badge">${spotsLeft} spots</span></div>
    `;

    const participantsRow = document.createElement("div");
    participantsRow.className = "participants-row";

    details.participants.slice(0, 6).forEach((p) => {
      const pImg = document.createElement("img");
      pImg.className = "participant";
      const seed = p.split("@")[0] || p;
      pImg.src = avatarUrl(seed, "gridy");
      pImg.alt = p;
      participantsRow.appendChild(pImg);
    });

    content.appendChild(participantsRow);

    // progress bar
    const percent = Math.round((details.participants.length / details.max_participants) * 100);
    const progressWrap = document.createElement('div');
    progressWrap.className = 'progress';
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.style.width = Math.min(100, percent) + '%';
    progressWrap.appendChild(progressBar);
    content.appendChild(progressWrap);

    if (details.participants.length >= details.max_participants) {
      const fullBadge = document.createElement('div');
      fullBadge.className = 'full-badge';
      fullBadge.textContent = 'Full';
      content.appendChild(fullBadge);
    }

    card.appendChild(avatar);
    card.appendChild(content);

    // Click selects activity in the signup panel
    card.addEventListener("click", () => {
      activitySelect.value = name;
      showSelectedActivity(name, details);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    return card;
  }

  function showSelectedActivity(name, details) {
    selectedActivityDiv.classList.remove("empty");
    selectedActivityDiv.innerHTML = `
      <strong>${name}</strong>
      <div style="margin-top:6px;" class="meta">${details.description}</div>
      <div class="meta" style="margin-top:8px;"><strong>Schedule:</strong> ${details.schedule}</div>
      <div style="margin-top:8px;"><span class="badge">${details.participants.length}/${details.max_participants} enrolled</span></div>
    `;
  }

  // Function to fetch activities from API and render UI
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";

      // Reset select
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      Object.entries(activities).forEach(([name, details]) => {
        const card = renderActivityCard(name, details);
        activitiesList.appendChild(card);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        if (details.participants.length >= details.max_participants) {
          option.disabled = true;
        }
        activitySelect.appendChild(option);
      });

      // If a selected value exists, refresh selection state
      const selectedName = activitySelect.value;
      if (selectedName) {
        const el = activitiesList.querySelector(`.activity-card[data-name="${selectedName}"]`);
        if (el) el.click();
      }
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Filter visible activity cards by search text
  function filterActivities(query) {
    const cards = activitiesList.querySelectorAll('.activity-card');
    cards.forEach((card) => {
      const name = card.dataset.name.toLowerCase();
      const inText = name.includes(query.toLowerCase());
      card.style.display = inText ? '' : 'none';
    });
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const activity = document.getElementById("activity").value;

    if (!email || !activity) {
      messageDiv.textContent = "Please provide a valid email and choose an activity.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 4000);
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message || "Signed up successfully.";
        messageDiv.className = "message success";
        signupForm.reset();
        // Refresh activities to update counts and participants
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      console.error("Error signing up:", error);
    }

    messageDiv.classList.remove("hidden");
    setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  });

  // When showing selected activity, toggle signup button based on fullness
  const signupButton = document.querySelector('#signup-form button');
  function toggleSignupButton(name, activities) {
    if (!name) {
      signupButton.disabled = false;
      return;
    }
    const option = activitySelect.querySelector(`option[value="${name}"]`);
    signupButton.disabled = option ? option.disabled : false;
  }

  // Patch showSelectedActivity to toggle signup button (override existing function reference)
  const originalShow = showSelectedActivity;
  showSelectedActivity = (name, details) => {
    originalShow(name, details);
    toggleSignupButton(name);
  };

  // Wire up search
  searchInput.addEventListener('input', (e) => {
    filterActivities(e.target.value);
  });

  // Initial load
  fetchActivities();
});
