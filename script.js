// =============================================
// PH CITY EXPLORER
// Open-Meteo API + Leaflet.js
// =============================================

// 1. INITIALIZE THE MAP

const map = L.map("map").setView([12.8797, 121.774], 6);

// 2. ADD OPENSTREETMAP TILE LAYER

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,

  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
}).addTo(map);

// 3. CREATE A MARKER LAYER

const markerLayer = L.layerGroup().addTo(map);

// 4. GET HTML ELEMENTS

const searchForm = document.getElementById("searchForm");

const cityInput = document.getElementById("cityInput");

const searchButton = document.getElementById("searchButton");

const statusIcon = document.getElementById("statusIcon");

const statusTitle = document.getElementById("statusTitle");

const statusMessage = document.getElementById("statusMessage");

const resultCount = document.getElementById("resultCount");

const resultsList = document.getElementById("resultsList");

// Store the current markers

let currentMarkers = [];

// =============================================
// 5. UPDATE STATUS MESSAGE
// =============================================

function setStatus(title, message, type = "ready") {
  statusTitle.textContent = title;

  statusMessage.textContent = message;

  statusIcon.className = "status-icon";

  if (type === "loading") {
    statusIcon.classList.add("loading");
  }

  if (type === "error") {
    statusIcon.classList.add("error");
  }
}

// =============================================
// 6. DISPLAY EMPTY STATE
// =============================================

function showEmptyState(message) {
  resultsList.replaceChildren();

  const empty = document.createElement("div");

  empty.className = "empty-state";

  const icon = document.createElement("span");

  icon.className = "empty-icon";

  icon.textContent = "⌖";

  const paragraph = document.createElement("p");

  paragraph.textContent = message;

  empty.append(icon, paragraph);

  resultsList.appendChild(empty);

  resultCount.textContent = "0";
}

// =============================================
// 7. CREATE POPUP CONTENT
// =============================================

function createPopupContent(place) {
  const container = document.createElement("div");

  const name = document.createElement("div");

  name.className = "popup-name";

  name.textContent = place.name || "Unknown place";

  const country = document.createElement("div");

  country.className = "popup-country";

  country.textContent = place.country || "Philippines";

  container.append(name, country);

  return container;
}

// =============================================
// 8. DISPLAY LOCATIONS ON THE MAP
// =============================================

function displayLocations(locations) {
  const bounds = [];

  currentMarkers = [];

  resultsList.replaceChildren();

  locations.forEach((place, index) => {
    // Get latitude and longitude

    const coordinates = [place.latitude, place.longitude];

    bounds.push(coordinates);

    // CREATE MAP MARKER

    const marker = L.marker(coordinates).addTo(markerLayer);

    marker.bindPopup(createPopupContent(place));

    currentMarkers.push(marker);

    // CREATE RESULT CARD

    const card = document.createElement("button");

    card.type = "button";

    card.className = "result-card";

    card.setAttribute("aria-label", `Show ${place.name} on map`);

    // RESULT NUMBER

    const number = document.createElement("span");

    number.className = "result-number";

    number.textContent = String(index + 1).padStart(2, "0");

    // LOCATION INFORMATION

    const info = document.createElement("span");

    info.className = "result-info";

    const name = document.createElement("strong");

    name.textContent = place.name || "Unknown place";

    const detail = document.createElement("small");

    const region = place.admin1 ? `${place.admin1}, ` : "";

    detail.textContent = `${region}${place.country || "Philippines"}`;

    // ARROW ICON

    const arrow = document.createElement("span");

    arrow.className = "result-arrow";

    arrow.textContent = "↗";

    info.append(name, detail);

    card.append(number, info, arrow);

    // CLICK RESULT CARD TO OPEN MARKER

    card.addEventListener("click", () => {
      document.querySelectorAll(".result-card").forEach((item) => {
        item.classList.remove("active");
      });

      card.classList.add("active");

      map.setView(coordinates, 11, {
        animate: true,
      });

      marker.openPopup();
    });

    resultsList.appendChild(card);
  });

  // UPDATE RESULT COUNT

  resultCount.textContent = String(locations.length);

  // ADJUST MAP ZOOM

  if (bounds.length === 1) {
    map.setView(bounds[0], 11);

    currentMarkers[0].openPopup();
  } else if (bounds.length > 1) {
    map.fitBounds(bounds, {
      padding: [45, 45],
      maxZoom: 10,
    });
  }
}

// =============================================
// 9. SEARCH FORM EVENT
// =============================================

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  // GET USER INPUT

  const city = cityInput.value.trim();

  // VALIDATE INPUT

  if (city.length < 2) {
    setStatus(
      "Search is too short",
      "Please enter at least two characters.",
      "error",
    );

    cityInput.focus();

    return;
  }

  // CLEAR OLD MARKERS AND RESULTS

  markerLayer.clearLayers();

  currentMarkers = [];

  showEmptyState("Searching for matching cities...");

  // SHOW LOADING MESSAGE

  setStatus(
    "Searching locations",
    `Looking for "${city}" in the Philippines...`,
    "loading",
  );

  searchButton.disabled = true;

  searchButton.querySelector("span").textContent = "Searching...";

  // =============================================
  // 10. FETCH DATA FROM OPEN-METEO API
  // =============================================

  try {
    const url =
      "https://geocoding-api.open-meteo.com/v1/search?" +
      new URLSearchParams({
        name: city,

        count: "20",

        language: "en",

        format: "json",
      });

    // SEND API REQUEST

    const response = await fetch(url);

    // CHECK RESPONSE

    if (!response.ok) {
      throw new Error(
        `The location service returned an error (${response.status}).`,
      );
    }

    // CONVERT RESPONSE INTO JSON

    const data = await response.json();

    // GET SEARCH RESULTS

    const allResults = data.results ?? [];

    // FILTER PHILIPPINE LOCATIONS

    const philippineResults = allResults

      .filter(
        (place) =>
          place.country_code === "PH" ||
          place.country?.toLowerCase() === "philippines",
      )

      .slice(0, 5);

    // =============================================
    // 11. CHECK IF RESULTS EXIST
    // =============================================

    if (philippineResults.length === 0) {
      showEmptyState(
        "No matching Philippine city found. Try another spelling.",
      );

      setStatus(
        "No results found",
        `We couldn't find "${city}" in the Philippines. Check the spelling and try again.`,
        "error",
      );

      map.setView([12.8797, 121.774], 6);

      return;
    }

    // =============================================
    // 12. DISPLAY RESULTS
    // =============================================

    displayLocations(philippineResults);

    const countText =
      philippineResults.length === 1
        ? "1 matching location found."
        : `${philippineResults.length} matching locations found.`;

    setStatus(
      "Locations found",
      `${countText} Select a result or map marker to explore.`,
      "ready",
    );
  } catch (error) {
    // =============================================
    // 13. HANDLE ERRORS
    // =============================================

    console.error("City search error:", error);

    showEmptyState(
      "Something went wrong. Please check your connection and try again.",
    );

    setStatus(
      "Unable to complete search",
      error.message || "A network error occurred. Please try again.",
      "error",
    );

    map.setView([12.8797, 121.774], 6);
  } finally {
    // =============================================
    // 14. RESTORE SEARCH BUTTON
    // =============================================

    searchButton.disabled = false;

    searchButton.querySelector("span").textContent = "Explore city";
  }
});
