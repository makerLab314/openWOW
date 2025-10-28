// Standorte aus Ihrer Liste
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
let map, userMarker;
let currentLocation = null;

// Initialisiert die App, sobald das DOM geladen ist
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadVisitedState();
    geocodeAllLocations();
    getUserLocation();

    hideVisitedCheckbox.addEventListener('change', renderLocationsList);
});

// Initialisiert die Leaflet-Karte
function initMap() {
    map = L.map('map').setView([50.1109, 8.6821], 12); // Standard-Zentrum (Frankfurt)

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
                
                statusElement.textContent = "Standort gefunden!";
                map.setView(currentLocation, 14);
                
                if (userMarker) userMarker.remove();
                userMarker = L.circleMarker(currentLocation, {
                    radius: 8,
                    color: 'white',
                    weight: 2,
                    fillColor: '#4285F4',
                    fillOpacity: 1
                }).addTo(map)
                  .bindPopup("Dein Standort")
                  .openPopup();
                
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

// Wandelt Adressen in Koordinaten um (Geocoding) mit Nominatim
function geocodeAllLocations() {
    locations.forEach((location, index) => {
        // Kleine Verzögerung, um die Nominatim-API-Richtlinien einzuhalten (max 1 Anfrage/Sekunde)
        setTimeout(() => {
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location.address)}`)
                .then(response => response.json())
                .then(data => {
                    if (data && data.length > 0) {
                        location.coords = L.latLng(data[0].lat, data[0].lon);
                        L.marker(location.coords).addTo(map)
                            .bindPopup(`<b>Klasse ${location.class} - ${location.name}</b><br>${location.address}`);
                    } else {
                        console.error(`Geocode war nicht erfolgreich für ${location.address}`);
                    }
                })
                .catch(error => console.error('Error:', error));
        }, index * 1000); // 1 Sekunde Verzögerung pro Anfrage
    });
}

// Rendert die Liste der Standorte
function renderLocationsList() {
    if (currentLocation) {
        // Entfernungen berechnen
        locations.forEach(loc => {
            if (loc.coords) {
                loc.distance = currentLocation.distanceTo(loc.coords);
            } else {
                loc.distance = Infinity;
            }
        });
        // Nach Entfernung sortieren
        locations.sort((a, b) => a.distance - b.distance);
    }

    locationsListElement.innerHTML = ''; // Liste leeren

    const showAll = !hideVisitedCheckbox.checked;

    locations.forEach((location, index) => {
        if (showAll || !location.visited) {
            const item = document.createElement('div');
            item.className = 'location-item';
            if (location.visited) {
                item.classList.add('visited');
            }

            const distanceText = location.distance !== Infinity && location.distance != null
                ? `<p class="distance">ca. ${(location.distance / 1000).toFixed(1)} km entfernt</p>`
                : '';
            
            const noteText = location.note ? ` (${location.note})` : '';

            // Link zu Google Maps für die Navigation beibehalten, da dies eine sehr verbreitete App ist.
            const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}`;

            item.innerHTML = `
                <input type="checkbox" data-index="${index}" ${location.visited ? 'checked' : ''}>
                <div class="info">
                    ${distanceText}
                    <h3>Klasse ${location.class} (${location.name})</h3>
                    <p>${location.address}${noteText}</p>
                    <a href="${mapsUrl}" target="_blank" class="gmaps-link">Navigation starten</a>
                </div>
            `;
            locationsListElement.appendChild(item);
        }
    });

    // Event Listener für die neuen Checkboxen hinzufügen
    document.querySelectorAll('.location-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const index = e.target.getAttribute('data-index');
            locations[index].visited = e.target.checked;
            saveVisitedState();
            renderLocationsList();
        });
    });
}

// Speichert den "besucht"-Status im Local Storage
function saveVisitedState() {
    const visitedStatus = locations.map(loc => loc.visited);
    localStorage.setItem('visitedLocations', JSON.stringify(visitedStatus));
}

// Lädt den "besucht"-Status aus dem Local Storage
function loadVisitedState() {
    const visitedStatus = JSON.parse(localStorage.getItem('visitedLocations'));
    if (visitedStatus && visitedStatus.length === locations.length) {
        locations.forEach((loc, index) => {
            loc.visited = visitedStatus[index];
        });
    }
}
