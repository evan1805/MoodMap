window.addEventListener('DOMContentLoaded', () => {
  document.getElementById("authBox").style.display = "none";
  document.getElementById("authRegister").style.display = "none";
  document.getElementById("deleteModal").style.display = "none";
  document.getElementById("myMoodsList").style.display = "none";
  const settingsBtn = document.getElementById("settingsBtn");
const settingsMenu = document.getElementById("settingsMenu");
settingsBtn.style.display = "none";
settingsMenu.style.display = "none";


});

const allMarkers = [];


const firebaseConfig = {
  apiKey: "AIzaSyC0dpr078oVW2QtSMUVVaypoVEKPW0A9Lo",
  authDomain: "moodmap-1ecec.firebaseapp.com",
  projectId: "moodmap-1ecec",
  storageBucket: "moodmap-1ecec.firebasestorage.app",
  messagingSenderId: "924808754986",
  appId: "1:924808754986:web:7a48ff7956ae5be4f21053",
  measurementId: "G-D46WT4Y2YC"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
let currentUser = null;
const panel = document.getElementById("panelAfterLogin");


// === INITIALISATION CARTE ===
const bounds = L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180));
const map = L.map('map', { maxBounds: bounds, maxBoundsViscosity: 1, minZoom: 3, maxZoom: 18 }).setView([20, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  noWrap: true
}).addTo(map);

// === LÉGENDE AVEC MENU DÉROULANT ===
const legend = L.control({ position: "topright" });

legend.onAdd = function(map) {
  const div = L.DomUtil.create("div", "legend-container");
  div.style.background = "white";
  div.style.padding = "5px";
  div.style.borderRadius = "5px";
  div.style.boxShadow = "0 0 5px rgba(0,0,0,0.3)";
  div.innerHTML = `
    <label for="legendSelect" style="font-weight:bold;">Filter :</label>
    <select id="legendSelect" style="margin-left:5px; padding:2px 5px; cursor: pointer;border: 2px solid rgb(247, 0, 255); border-radius: 10px;">
      <option value="all"> All moods</option>
      <option value="😄">😄 Happy</option>
      <option value="😐">😐 Neutral</option>
      <option value="☹️">☹️ Disappointed</option>
      <option value="😡">😡 Angry</option>
      <option value="my"> 🟡 My points</option>
    </select>
  `;
  
  L.DomEvent.disableClickPropagation(div); // pour que le clic sur la légende ne ferme pas les popups
  return div;
};

legend.addTo(map);


// === RECHERCHE DE LIEU ===
document.getElementById("searchBtn").onclick = function () {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) return;
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
    .then(res => res.json())
    .then(data => {
      if (!data.length) return alert("Lieu non trouvé");
      map.setView([data[0].lat, data[0].lon], 8);
    });
};

// === BOUTONS CARTE / PROFIL ===
const btnCarte = document.getElementById("btnCarte");
const btnAutre = document.getElementById("btnAutre");
const mapDiv = document.getElementById("map");
const searchBar = document.getElementById("searchBar");
document.getElementById("authBox").style.display = "none";


mapDiv.style.display = "block";
searchBar.style.display = "flex";

btnCarte.onclick = () => {
  mapDiv.style.display = "block";
  searchBar.style.display = "flex";
  autrePanel.style.display = "none";

  settingsBtn.style.display = "none";   // CACHE engrenage
  settingsMenu.style.display = "none";  // ferme menu
  panelAfterLogin.style.display = "none"; // 👈 cache panneau

  document.getElementById("authBox").style.display = "none";
  document.getElementById("authRegister").style.display = "none";

  map.invalidateSize();
};



btnAutre.onclick = () => {
  document.getElementById("notification").style.display = "none";
  mapDiv.style.display = "none";
  searchBar.style.display = "none";
  autrePanel.style.display = "block";

  if (!currentUser) {
    document.getElementById("authBox").style.display = "block";
    settingsBtn.style.display = "none"; // pas connecté
    panelAfterLogin.style.display = "none"; // 👈 cache panneau
  } else {
    document.getElementById("authBox").style.display = "none";
    settingsBtn.style.display = "block"; // connecté
    panelAfterLogin.style.display = "block"; // 👈 affiche panneau
  }

  settingsMenu.style.display = "none"; // menu fermé au switch
  document.getElementById("authRegister").style.display = "none";
};
function showNotification(content) {
  const notif = document.getElementById("notification");
  if (!notif) return; // sécurité
  notif.innerHTML = content;
  notif.style.display = "block";

  // cacher après 5 secondes
  setTimeout(() => {
    notif.style.display = "none";
  }, 5000);
}



// === AJOUT DE POINTS ===
map.on('click', function (e) {
  if (!firebase.auth().currentUser) {  // <-- remplacer currentUser par firebase.auth().currentUser
    showNotification(`
      Create an account to add a point ! 🙂<br><br>
      <button id="btn-notaf" class="notif-btn" onclick="btnAutre.click()">
        ➔ Go to Login
      </button>
    `);
    return;
  }
  const tempPopup = L.popup()
    .setLatLng(e.latlng)
    .setContent(`
      <div style="text-align:center;">
        Add a point here ?<br><br>
        <button style="background:#ba34db;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;" 
          onclick="map.closePopup(); createMarker(L.latLng(${e.latlng.lat}, ${e.latlng.lng}));">
          Yes
        </button>
        <button style="background:#e73c59;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;" 
          onclick="map.closePopup();">No</button>
      </div>
    `).openOn(map);
});


// === FONCTIONS ===
function getColoredMarker(mood, isOwn = false) {
  let color;
  if (isOwn) {
    color = "#d4d100ff"; // ← tes points seront jaunes
  } else {
    if (mood === '😄') color = "#2ecc71";
    else if (mood === '😐') color = "#3498db";
    else if (mood === '☹️') color = "#ff7f50";
    else if (mood === '😡') color = "#e74c3c";
    else color = "#3498db";
  }

  return L.divIcon({
    className: "",
    html: `<div class="mood-marker" style="background:${color}"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26]
  });
}


function createMarker(latlng) {
  const id = Date.now();
  const marker = L.marker(latlng).addTo(map);

  const popup = `
    <div class="popup-content">
      <textarea id="text${id}" placeholder="Describe your mood" rows="1" style="width:100%; resize:none; overflow:hidden;" maxlength="260" oninput="autoResizeTextarea('${id}'); checkPublish('${id}')"></textarea>
      <div class="smileys" id="smileys${id}">
        <span onclick="selectMood('${id}', '😄')">😄</span>
        <span onclick="selectMood('${id}', '😐')">😐</span>
        <span onclick="selectMood('${id}', '☹️')">☹️</span>
        <span onclick="selectMood('${id}', '😡')">😡</span>
      </div>
      <button id="publish${id}" class="btn-publish" disabled 
        onclick="publish('${id}', ${marker._leaflet_id}, ${latlng.lat}, ${latlng.lng}, event)">
        publish ➤
      </button>
      <button class="btn-delete" onclick="showDeleteConfirm('${id}', ${marker._leaflet_id})">
  Delete 🗑️
</button>
<div id="confirm${id}" style="display:none; margin-top:5px;">
  <p>Delete this point ?</p>
  <button onclick="deleteTempMarker(${marker._leaflet_id})"style="background-color: #e73c59; cursor: pointer; border-radius: 10px; border: 0px solid rgba(255, 255, 255, 1); height: 25px; width: 40px; color: white;">Yes</button>
  <button onclick="hideDeleteConfirm('${id}')"style="background-color: purple; cursor: pointer; border-radius: 10px; border: 0px solid rgba(255, 255, 255, 1); height: 25px; width: 40px; color: white;">No</button>
</div>
  `;

  marker.bindPopup(popup, { maxWidth: 400 }).openPopup();
}


function selectMood(id, mood) {
  const container = document.getElementById("smileys" + id);
  [...container.children].forEach(s => s.classList.remove("selected"));
  event.target.classList.add("selected");
  container.dataset.mood = mood;
  checkPublish(id);
}

function checkPublish(id) {
  const text = document.getElementById("text" + id).value.trim();
  const mood = document.getElementById("smileys" + id).dataset.mood;
  document.getElementById("publish" + id).disabled = !(text && mood);
}

function autoResizeTextarea(id) {
  const textarea = document.getElementById("text" + id);
  if (!textarea) return;
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

function publish(id, markerId, lat, lng, e) {
  e.stopPropagation();

  const text = document.getElementById("text" + id).value;
  const mood = document.getElementById("smileys" + id).dataset.mood;

  // 1️⃣ Ajouter le document dans Firestore
  db.collection("moods").add({
    lat,
    lng,
    mood,
    text,
    userId: currentUser.uid,
    username: currentUsername,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(docRef => {
    // 2️⃣ Créer directement le marker sur la carte avec le bouton Supprimer
    const marker = L.marker([lat, lng], {
      icon: getColoredMarker(mood)
    }).addTo(map);

    marker.mood = mood;
    marker.userId = currentUser.uid;
allMarkers.push(marker);

    marker.firestoreId = docRef.id;

    let date = new Date().toLocaleString("fr-FR"); // Date immédiate

    let popupHTML = `
      <b>${mood}</b>  <i>${currentUsername}</i><br>
      <small style="opacity:0.6;">${date}</small><br>
      <div style="white-space: pre-wrap; word-wrap: break-word; max-width:380px;">
        ${text}
      </div>
      <br>
      <button class="btn-delete"
        onclick="openDeleteConfirm('${marker.firestoreId}', ${lat}, ${lng})">
        Delete 🗑️
      </button>
    `;

    marker.bindPopup(popupHTML);
  });

  // 3️⃣ Supprimer le marker temporaire
  map.eachLayer(l => {
    if (l._leaflet_id === markerId) map.removeLayer(l);
  });

  map.closePopup();
}

// Afficher les points Firestore en temps réel
db.collection("moods").orderBy("createdAt").onSnapshot(snapshot => {
  snapshot.docChanges().forEach(change => {

    if (change.type === "added") {
      const data = change.doc.data();
      const date = data.createdAt
  ? data.createdAt.toDate().toLocaleString("fr-FR")
  : "";

        const isOwn = currentUser && data.userId === currentUser.uid;
      const marker = L.marker([data.lat, data.lng], {
        icon: getColoredMarker(data.mood, isOwn)
      }).addTo(map);

      marker.mood = data.mood;
      marker.userId = data.userId;
allMarkers.push(marker);

      // lien marker ↔ firestore
      marker.firestoreId = change.doc.id;

      let popupHTML = `
  <b>${data.mood}</b><br>
  <small style="opacity:0.6;">${date}</small><br>
  <div style="white-space: pre-wrap; word-wrap: break-word; max-width:380px;">
    ${data.text}
  </div>
`;

      // bouton supprimer UNIQUEMENT pour le propriétaire
      if (currentUser && data.userId === currentUser.uid) {
        popupHTML += `
          <br>
          <button class="btn-delete" onclick="openDeleteConfirm('${marker.firestoreId}', ${data.lat}, ${data.lng})">Delete 🗑️</button>
        `;
      }

      marker.bindPopup(popupHTML);
    }

    // suppression en temps réel
    if (change.type === "removed") {
      map.eachLayer(layer => {
        if (layer.firestoreId === change.doc.id) {
          map.removeLayer(layer);
        }
      });
    }

  });
});


// Supprimer un marker (uniquement le sien)
function deleteMarker(markerUserId, firestoreId, leafletId) {
  if (!currentUser || markerUserId !== currentUser.uid) {
    alert("You can only delete your points");
    return;
  }

  map.eachLayer(l => {
    if (l._leaflet_id === leafletId) {
      map.removeLayer(l);
    }
  });

  db.collection("moods").doc(firestoreId).delete();
}

// INSCRIPTION
function register() {
  const username = document.getElementById("usernameRegister").value.trim();
  const email = document.getElementById("emailRegister").value;
  const password = document.getElementById("passwordRegister").value;

  if (!username) {
    document.getElementById("authMsg").innerText = "Username required";
    return;
  }

  auth.createUserWithEmailAndPassword(email, password)
    .then(cred => {
      return db.collection("users").doc(cred.user.uid).set({
        username: username
      });
    })
    .then(() => {
      document.getElementById("authMsg").innerText = "account created 🎉";
      location.reload(); 
    })
    .catch(err => {
      document.getElementById("authMsg").innerText = err.message;
    });
}



// CONNEXION
function login() {
  const email = emailInput();
  const password = passwordInput();

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      location.reload(); // ✅ refresh UNE fois après connexion
    })
    .catch(err => {
      document.getElementById("authMsg").innerText = err.message;
    });
}


// DÉCONNEXION
function logout() {
  auth.signOut().then(() => {
    location.reload(); // ✅ refresh UNE fois après déconnexion
  });
}


// ÉTAT DE CONNEXION (PERSISTANT)
auth.onAuthStateChanged(user => {
  const panel = document.getElementById("panelAfterLogin");

  if (user) {
    currentUser = user;
    loadMoodStats();
     affichermesmoods();
    document.getElementById("authBox").style.display = "none"; // 👈 affiche le panneau après connexion
    document.getElementById("authBox").style.display = "none";
    document.getElementById("authRegister").style.display = "none";
    db.collection("users").doc(user.uid).get().then(doc => {
  if (doc.exists) {
    currentUsername = doc.data().username;
    document.getElementById("userNameDisplay").innerText =
      "Username : " + doc.data().username;
  }
  db.collection("users").doc(user.uid).get().then(doc => {
  if (doc.exists && doc.data().avatar) {
    const img = document.getElementById("avatarPreview");
    img.src = doc.data().avatar;
    img.style.display = "block";
    document.getElementById("avatarPlus").style.display = "none";
  }
});
});


  } else {
    currentUser = null;
    panel.style.display = "none"; // 👈 cache le panneau quand déconnecté
    document.getElementById("authBox").style.display = "none";
    document.getElementById("authRegister").style.display = "none";

  }
});


// Helpers
function emailInput() {
  return document.getElementById("email").value;
}
function passwordInput() {
  return document.getElementById("password").value;
}
function showDeleteConfirm(id, leafletId) {
  document.getElementById("confirm" + id).style.display = "block";
}

function hideDeleteConfirm(id) {
  document.getElementById("confirm" + id).style.display = "none";
}

function deleteTempMarker(leafletId) {
  map.eachLayer(l => {
    if (l._leaflet_id === leafletId) {
      map.removeLayer(l);
    }
  });
  map.closePopup();
}
function deleteMood(firestoreId) {
  if (!currentUser) return;

  db.collection("moods").doc(firestoreId).delete();
  map.closePopup();
}

function openDeleteConfirm(firestoreId, lat, lng) {
  const popup = L.popup({ offset: [0, -20] })
    .setLatLng([lat, lng])
    .setContent(`
      <div style="text-align:center;">
        Delete this point ?<br><br>
        <button class="btn-delete"
          onclick="deleteMood('${firestoreId}')">
          Yes
        </button>
        <button onclick="map.closePopup()" style="background-color: purple; cursor: pointer; border-radius: 10px; border: 0px; height: 25px; width: 40px; color: white;">
          No
        </button>
      </div>
    `)
    .openOn(map);
}

// Quand l'état de connexion change, on met à jour le panneau


document.getElementById("legendSelect").addEventListener("change", function() {
  const value = this.value;

  allMarkers.forEach(marker => {
  if (value === "all") {
    marker.addTo(map);
  } else if (value === "my") {
    if (marker.userId === currentUser?.uid) marker.addTo(map);
    else map.removeLayer(marker);
  } else if (marker.mood === value) {
    marker.addTo(map);
  } else {
    map.removeLayer(marker);
  }
});
});
function confirmDeleteAccount() {
  if (!currentUser) return;

  const password = document.getElementById("deletePassword").value;
  if (!password) return alert("Enter your password");

  const email = currentUser.email;
  const credential = firebase.auth.EmailAuthProvider.credential(email, password);

  // 🔐 Re-auth obligatoire
  currentUser.reauthenticateWithCredential(credential)
    .then(() => {
      const uid = currentUser.uid;

      // supprimer username
      db.collection("users").doc(uid).delete();

      // supprimer moods
      db.collection("moods")
        .where("userId", "==", uid)
        .get()
        .then(snap => snap.forEach(doc => doc.ref.delete()));

      // supprimer compte
      currentUser.delete().then(() => {
        alert("Account deleted");
        location.reload();
      });
    })
    .catch(() => {
      alert("Wrong password");
    });
}

function openDeleteModal() {
  document.getElementById("deleteModal").style.display = "flex";
}

function closeDeleteModal() {
  document.getElementById("deleteModal").style.display = "none";
  document.getElementById("deletePassword").value = "";
}
const settingsBtn = document.getElementById("settingsBtn");
const settingsMenu = document.getElementById("settingsMenu");

settingsBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  settingsMenu.style.display =
    settingsMenu.style.display === "block" ? "none" : "block";
});

window.addEventListener("click", () => {
  settingsMenu.style.display = "none";
});
document.getElementById("avatarInput").addEventListener("change", function () {
  const file = this.files[0];
  if (!file || !currentUser) return;

  const reader = new FileReader();
  reader.onload = function () {
    const base64Image = reader.result;

    // afficher
    const img = document.getElementById("avatarPreview");
    img.src = base64Image;
    img.style.display = "block";
    document.getElementById("avatarPlus").style.display = "none";

    // sauvegarder dans Firestore
    db.collection("users").doc(currentUser.uid).update({
      avatar: base64Image
    });
  };
  reader.readAsDataURL(file);
});
function loadMoodStats() {
  if (!currentUser) return;

  let counts = {
    happy: 0,
    neutral: 0,
    sad: 0,
    angry: 0
  };

  db.collection("moods")
    .where("userId", "==", currentUser.uid)
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const mood = doc.data().mood;
        if (mood === "😄") counts.happy++;
        if (mood === "😐") counts.neutral++;
        if (mood === "☹️") counts.sad++;
        if (mood === "😡") counts.angry++;
      });

      document.getElementById("count-happy").innerText = counts.happy;
      document.getElementById("count-neutral").innerText = counts.neutral;
      document.getElementById("count-sad").innerText = counts.sad;
      document.getElementById("count-angry").innerText = counts.angry;
    });
}
function affichermesmoods() {
  document.getElementById("myMoodsList").style.display = "block";
  const container = document.getElementById("myMoodsList");

  container.innerHTML = ""; // vide la liste

  db.collection("moods")
    .where("userId", "==", currentUser.uid)
    .get()
    .then(snapshot => {

      snapshot.forEach(doc => {
        const data = doc.data();

        // ✅ AJOUT (date)
        const date = data.createdAt
          ? data.createdAt.toDate().toLocaleString("fr-FR")
          : "";

        const div = document.createElement("div");

        // ✅ MODIF MINIMALE (même contenu + date)
        div.innerHTML = data.mood + " - " + data.text + "<br><small>" + date + "</small>";

        container.appendChild(div);
      });

    });
}
