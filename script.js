// Standorte (Grunddaten)
const locations = [
    { address: "Berger Straße 174, Frankfurt am Main", class: "11a", name: "Markus Just", visited: false },
    { address: "Oeder Weg 49, Frankfurt am Main", class: "10a", name: "Bertold Breig", visited: false },
    { address: "Steinweg, Frankfurt am Main", note: "am U-Bahnabgang", class: "7a", name: "Sita Poutot", visited: false },
    { address: "Opernplatz, Frankfurt am Main", note: "Ecke Taunusanlage", class: "11b", name: "Petra Kolb", visited: false },
    { address: "Biebergasse, Frankfurt am Main", note: "Südseite, an den Bäumen", class: "8a", name: "Andrea Hübner", visited: false },
    { address: "Schweizer Platz, Frankfurt am Main", note: "Ecke Oppenheimer Landstraße/ Schneckhofstraße", class: "10b", name: "Anja Grund", visited: false },
    { address: "Kalbächer Gasse, Frankfurt am Main", note: "Ecke Börsenstraße", class: "7b", name: "Lea Zurr", visited: false },
    { address: "Töngesgasse, Frankfurt am Main", note: "Ecke Hasengasse", class: "8b", name: "El Ham El Zein", visited: false },
    { address: "Merianplatz, Frankfurt am Main", note: "neben dem U-Bahn-Abgang", class: "9b", name: "Christoph Langheim", visited: false }
];

const locationsListElement = document.getElementById('locations-list');
const hideVisitedCheckbox = document.getElementById('hide-visited');
const statusElement = document.getElementById('status');
const refreshButton = document.getElementById('refresh-btn');
const mapElement = document.getElementById('map');
const overlayToggle = document.getElementById('overlay-toggle');
const themeToggle = document.getElementById('theme-toggle');
let map, userMarker;
let currentLocation = null;
let locationMarkers = {}; // Objekt zum Speichern der Marker

// Initialisiert die App
document.addEventListener('DOMContentLoaded', () => {
    try {
        initMap();
    } catch (e) {
        console.error("Map initialization failed:", e);
    }
    setupMobileOverlay();
    loadPreferencesAndData();
    getUserLocation();
    initThemeToggle();

    hideVisitedCheckbox.addEventListener('change', () => {
        localStorage.setItem('hideVisitedPreference', hideVisitedCheckbox.checked);
        updateMapMarkers();
        renderLocationsList();
    });
    refreshButton.addEventListener('click', () => {
        statusElement.textContent = "Standort wird neu ermittelt...";
        getUserLocation();
    });
    
    // Mobile overlay toggle
    overlayToggle.addEventListener('click', () => {
        locationsListElement.classList.toggle('open');
    });
    
    // Close overlay when clicking on "Auf Karte zeigen" button
    locationsListElement.addEventListener('click', (e) => {
        if (e.target.classList.contains('map-link')) {
            locationsListElement.classList.remove('open');
        }
    });
});

// Initialize theme toggle functionality
function initThemeToggle() {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        updateThemeIcon();
    }
    
    // Add click event listener
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        updateThemeIcon();
    });
}

// Update theme toggle icon
function updateThemeIcon() {
    const icon = themeToggle.querySelector('.theme-toggle-icon');
    if (document.body.classList.contains('dark-mode')) {
        icon.textContent = '☀️';
    } else {
        icon.textContent = '🌙';
    }
}

// Setup mobile overlay structure and gestures
function setupMobileOverlay() {
    // Create mobile overlay structure
    const mobileHandle = document.createElement('div');
    mobileHandle.className = 'mobile-handle';
    
    const mobileControls = document.createElement('div');
    mobileControls.className = 'mobile-controls';
    mobileControls.innerHTML = `
        <label>
            <input type="checkbox" id="hide-visited-mobile">
            Besuchte Standorte ausblenden
        </label>
        <button id="refresh-btn-mobile">Standort aktualisieren</button>
    `;
    
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'locations-scroll-container';
    
    // Move existing content to scroll container
    while (locationsListElement.firstChild) {
        scrollContainer.appendChild(locationsListElement.firstChild);
    }
    
    // Build new structure
    locationsListElement.appendChild(mobileHandle);
    locationsListElement.appendChild(mobileControls);
    locationsListElement.appendChild(scrollContainer);
    
    // Sync mobile controls with desktop controls
    const mobileCheckbox = document.getElementById('hide-visited-mobile');
    const mobileRefreshBtn = document.getElementById('refresh-btn-mobile');
    
    mobileCheckbox.checked = hideVisitedCheckbox.checked;
    
    mobileCheckbox.addEventListener('change', () => {
        hideVisitedCheckbox.checked = mobileCheckbox.checked;
        localStorage.setItem('hideVisitedPreference', mobileCheckbox.checked);
        updateMapMarkers();
        renderLocationsList();
    });
    
    mobileRefreshBtn.addEventListener('click', () => {
        statusElement.textContent = "Standort wird neu ermittelt...";
        getUserLocation();
    });
    
    // Handle swipe gestures on the handle area
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    
    mobileHandle.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        isDragging = true;
    }, { passive: true });
    
    mobileHandle.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
    }, { passive: true });
    
    mobileHandle.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        
        const diff = startY - currentY;
        
        // Swipe down to close
        if (diff < -50 && locationsListElement.classList.contains('open')) {
            locationsListElement.classList.remove('open');
        }
        // Swipe up to open
        else if (diff > 50 && !locationsListElement.classList.contains('open')) {
            locationsListElement.classList.add('open');
        }
        
        isDragging = false;
    });
    
    // Also handle swipe on scroll container when at top
    scrollContainer.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
    }, { passive: true });
    
    scrollContainer.addEventListener('touchmove', (e) => {
        currentY = e.touches[0].clientY;
        const diff = startY - currentY;
        
        // Prevent scrolling when trying to close and at top
        if (diff < 0 && scrollContainer.scrollTop === 0 && locationsListElement.classList.contains('open')) {
            // Allow swipe down to close
        }
    }, { passive: true });
    
    scrollContainer.addEventListener('touchend', (e) => {
        const diff = startY - currentY;
        
        // Swipe down to close when at top of scroll
        if (diff < -50 && scrollContainer.scrollTop === 0 && locationsListElement.classList.contains('open')) {
            locationsListElement.classList.remove('open');
        }
    });
}

// Initialisiert die Leaflet-Karte
function initMap() {
    map = L.map('map').setView([50.1109, 8.6821], 12); // Frankfurt
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

// Holt den Standort des Nutzers
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentLocation = L.latLng(position.coords.latitude, position.coords.longitude);
                statusElement.textContent = "Standort erfolgreich aktualisiert!";
                map.setView(currentLocation, 14);
                if (userMarker) userMarker.remove();
                userMarker = L.circleMarker(currentLocation, {
                    radius: 8, color: 'white', weight: 2, fillColor: '#4285F4', fillOpacity: 1
                }).addTo(map).bindPopup("Dein Standort").openPopup();
                renderLocationsList();
            },
            () => {
                statusElement.textContent = "Standort konnte nicht ermittelt werden.";
                renderLocationsList();
            }
        );
    } else {
        statusElement.textContent = "Geolocation wird nicht unterstützt.";
        renderLocationsList();
    }
}

// Lädt alle gespeicherten Daten und Einstellungen
function loadPreferencesAndData() {
    // "Ausblenden"-Einstellung wiederherstellen
    const hidePref = localStorage.getItem('hideVisitedPreference') === 'true';
    hideVisitedCheckbox.checked = hidePref;

    const cachedCoords = JSON.parse(localStorage.getItem('geocodedLocations'));
    const visitedStatus = JSON.parse(localStorage.getItem('visitedLocations'));

    // Lade visitedLocations als Objekt mit Adresse als Schlüssel
    if (visitedStatus && typeof visitedStatus === 'object') {
        locations.forEach(loc => {
            loc.visited = visitedStatus[loc.address] === true;
        });
    }

    if (cachedCoords && cachedCoords.length === locations.length) {
        console.log("Lade Koordinaten aus dem Cache.");
        locations.forEach((loc, index) => loc.coords = cachedCoords[index]);
        addMarkersToMap();
        renderLocationsList();
    } else {
        console.log("Keine gültigen Koordinaten im Cache. Starte Geocoding.");
        const scrollContainer = locationsListElement.querySelector('.locations-scroll-container');
        const targetElement = scrollContainer || locationsListElement;
        targetElement.innerHTML = '<p>Lade Standort-Koordinaten... Dies kann einen Moment dauern.</p>';
        geocodeAllLocations();
    }
}

// Fügt Marker für alle Standorte zur Karte hinzu und speichert sie
function addMarkersToMap() {
    locations.forEach(location => {
        if (location.coords) {
            const marker = L.marker([location.coords.lat, location.coords.lon]).addTo(map)
                .bindPopup(`<b>Klasse ${location.class} - ${location.name}</b><br>${location.address}`);
            locationMarkers[location.address] = marker; // Marker speichern
        }
    });
    updateMapMarkers(); // Initiale Filterung basierend auf den Einstellungen
}

// Aktualisiert die Sichtbarkeit der Marker basierend auf dem "hide visited" Status
function updateMapMarkers() {
    const hideVisited = hideVisitedCheckbox.checked;
    locations.forEach(location => {
        const marker = locationMarkers[location.address];
        if (marker) {
            if (hideVisited && location.visited) {
                map.removeLayer(marker);
            } else {
                if (!map.hasLayer(marker)) {
                    map.addLayer(marker);
                }
            }
        }
    });
}

// Wandelt Adressen in Koordinaten um und speichert sie
async function geocodeAllLocations() {
    const geocodingPromises = locations.map((location, index) => {
        return new Promise(resolve => {
            setTimeout(async () => {
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location.address)}`);
                    const data = await response.json();
                    location.coords = (data && data.length > 0) ? { lat: data[0].lat, lon: data[0].lon } : null;
                } catch (error) {
                    console.error('Error:', error);
                    location.coords = null;
                }
                resolve();
            }, index * 1000);
        });
    });

    await Promise.all(geocodingPromises);
    console.log("Geocoding abgeschlossen.");
    
    const coordsToCache = locations.map(loc => loc.coords);
    localStorage.setItem('geocodedLocations', JSON.stringify(coordsToCache));
    
    addMarkersToMap();
    renderLocationsList();
}

// Rendert die Liste der Standorte
function renderLocationsList() {
    if (currentLocation) {
        locations.forEach(loc => {
            loc.distance = loc.coords ? currentLocation.distanceTo(L.latLng(loc.coords.lat, loc.coords.lon)) : Infinity;
        });
        // Sortiere nach Entfernung, aber besuchte Orte kommen ans Ende
        locations.sort((a, b) => {
            if (a.visited && !b.visited) return 1;
            if (!a.visited && b.visited) return -1;
            return a.distance - b.distance;
        });
    }

    // Find the scroll container (or use locationsListElement for desktop)
    const scrollContainer = locationsListElement.querySelector('.locations-scroll-container');
    const targetElement = scrollContainer || locationsListElement;
    
    targetElement.innerHTML = '';
    const showAll = !hideVisitedCheckbox.checked;

    locations.forEach(location => {
        if (showAll || !location.visited) {
            const item = document.createElement('div');
            item.className = 'location-item';
            if (location.visited) item.classList.add('visited');

            const distanceText = location.distance !== Infinity && location.distance != null ? `<p class="distance">ca. ${(location.distance / 1000).toFixed(1)} km entfernt</p>` : '';
            const noteText = location.note ? ` (${location.note})` : '';
            const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}`;

            item.innerHTML = `
                <input type="checkbox" data-id="${location.address}" ${location.visited ? 'checked' : ''}>
                <div class="info">
                    ${distanceText}
                    <h3>Klasse ${location.class} (${location.name})</h3>
                    <p>${location.address}${noteText}</p>
                    <div class="actions">
                        <button class="map-link" data-lat="${location.coords?.lat}" data-lon="${location.coords?.lon}" data-address="${location.address}">Auf Karte zeigen</button>
                        <a href="${mapsUrl}" target="_blank" class="gmaps-link">Navigation</a>
                    </div>
                </div>
            `;
            targetElement.appendChild(item);
        }
    });

    addEventListenersToListItems();
    
    // Sync mobile checkbox state if it exists
    const mobileCheckbox = document.getElementById('hide-visited-mobile');
    if (mobileCheckbox) {
        mobileCheckbox.checked = hideVisitedCheckbox.checked;
    }
}

// Fügt alle Event-Listener für die Listeneinträge hinzu
function addEventListenersToListItems() {
    document.querySelectorAll('.location-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const address = e.target.getAttribute('data-id');
            const changedLocation = locations.find(loc => loc.address === address);
            if (changedLocation) {
                changedLocation.visited = e.target.checked;
                saveVisitedState();
                updateMapMarkers();
                renderLocationsList();
            }
        });
    });

    document.querySelectorAll('.map-link').forEach(button => {
        button.addEventListener('click', (e) => {
            const lat = e.target.getAttribute('data-lat');
            const lon = e.target.getAttribute('data-lon');
            const address = e.target.getAttribute('data-address');

            if (lat && lon) {
                map.setView([lat, lon], 17); // Zoom näher ran
                if (locationMarkers[address]) {
                    locationMarkers[address].openPopup();
                }
                mapElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Speichert den "besucht"-Status im Local Storage
function saveVisitedState() {
    const visitedStatus = {};
    locations.forEach(loc => {
        if (loc.visited) {
            visitedStatus[loc.address] = true;
        }
    });
    localStorage.setItem('visitedLocations', JSON.stringify(visitedStatus));
}