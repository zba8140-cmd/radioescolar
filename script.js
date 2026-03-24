const AUDIO_STREAM = "http://ice1.somafm.com/u80s-128-mp3";

const VIDEO_STREAM = "";

const audio = document.getElementById("audio");
const playBtn = document.getElementById("audio-play");
const pauseBtn = document.getElementById("audio-pause");

const video = document.getElementById("video");
const videoMessage = document.getElementById("video-message");

const showAudioBtn = document.getElementById("show-audio");
const showVideoBtn = document.getElementById("show-video");
const audioSection = document.getElementById("audio-section");
const videoSection = document.getElementById("video-section");

// Configurar el stream de audio
audio.src = AUDIO_STREAM;
audio.preload = "none";
audio.crossOrigin = "anonymous";

// Para compatibilidad con iOS
if (audio.playsInline !== undefined) {
  audio.playsInline = true;
}

// Reproducir audio
playBtn.addEventListener("click", () => {
  audio.load(); // Importante para iOS
  audio.play().catch(error => {
    console.error("Error al reproducir audio:", error);
    alert("No se pudo reproducir el audio. Intenta de nuevo.");
  });
});

// Pausar audio
pauseBtn.addEventListener("click", () => {
  audio.pause();
});

// CONFIGURACIÓN DEL VIDEO 

// Si hay stream de video disponible
if (VIDEO_STREAM && VIDEO_STREAM.trim() !== "") {
  video.src = VIDEO_STREAM;
  videoMessage.style.display = "none";

  video.addEventListener("loadeddata", () => {
    videoMessage.style.display = "none";
  });
  
  video.addEventListener("error", () => {
    console.error("Error al cargar el video");
    videoMessage.style.display = "flex";
  });
} else {
  // No hay video disponible
  videoMessage.style.display = "flex";
  video.style.display = "none";
}

// Mostrar sección de Audio
showAudioBtn.addEventListener("click", () => {
  // Actualizar botones activos
  showAudioBtn.classList.add("active");
  showVideoBtn.classList.remove("active");

  // Mostrar/ocultar secciones
  audioSection.classList.add("active");
  videoSection.classList.remove("active");

  // Pausar video si está reproduciéndose
  if (!video.paused) {
    video.pause();
  }
});

// Mostrar sección de Video
showVideoBtn.addEventListener("click", () => {
  // Actualizar botones activos
  showVideoBtn.classList.add("active");
  showAudioBtn.classList.remove("active");

  // Mostrar/ocultar secciones
  videoSection.classList.add("active");
  audioSection.classList.remove("active");

  // Pausar audio si está reproduciéndose
  if (!audio.paused) {
    audio.pause();
  }
});

// Detectar si el usuario está en un dispositivo móvil
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Verificar que Firebase esté cargado
function checkFirebase() {
  if (typeof firebase === 'undefined') {
    console.warn(' Firebase no está cargado. Las funciones de base de datos no estarán disponibles.');
    return false;
  }
  return true;
}

function listenToLiveStatus() {
  if (!checkFirebase()) return;

  db.collection('liveStatus').doc('current')
    .onSnapshot((doc) => {

      if (!doc.exists) {
        console.log('No hay estado live');
        getNextProgram();
        return;
      }

      const data = doc.data();
      console.log('Live actualizado:', data);

      if (data.isLive === true && data.currentProgram) {
        getCurrentProgram(data.currentProgram);
        updateLiveInfo(data);
      } else {
        updateLiveInfo(data);
        getNextProgram();
      }

    }, (error) => {
      console.error('Error en tiempo real:', error);
    });
}

async function getCurrentLiveStatus() {
  if (!checkFirebase()) {
    document.getElementById('program-card').style.display = 'none';
    return;
  }
  
  try {
    const doc = await liveStatusDoc.get();
    if (doc.exists) {
      const data = doc.data();
      
      console.log(' LiveStatus recibido:', data);
      
      // Si hay un programa EN VIVO
      if (data.isLive === true && data.currentProgram) {
        await getCurrentProgram(data.currentProgram);
        updateLiveInfo(data);
      } else {
        updateLiveInfo(data);
        getNextProgram();
      }
    } else {
      getNextProgram();
    }

    document.getElementById('program-card').style.display = 'none';
    
  } catch (error) {
    console.error("Error al obtener estado en vivo:", error);
    getNextProgram();
    document.getElementById('program-card').style.display = 'none';
  }
}
async function getNextProgram() {
  if (!checkFirebase()) return;

  try {
    const snapshot = await db.collection('programs')
      .where('isLive', '==', false)
      .orderBy('eventDate')
      .orderBy('startTime')
      .get();

    if (snapshot.empty) {
      document.getElementById('current-program-info').textContent =
        'No hay programas programados aún';
      return;
    }

    const now = new Date();
    let nextProgram = null;

    snapshot.forEach(doc => {
      const program = doc.data();

      if (!program.eventDate || !program.startTime) return;

      const startDateTime = new Date(`${program.eventDate}T${program.startTime}`);

      if (startDateTime > now && !nextProgram) {
        nextProgram = { id: doc.id, ...program };
      }
    });

    if (nextProgram) {
      displayNextProgram(nextProgram);
    } else {
      document.getElementById('current-program-info').textContent =
        'Próximamente: Programación por anunciar';
    }

  } catch (error) {
    console.error("Error al obtener próximo programa:", error);
  }
}

// Mostrar el próximo programa
function displayNextProgram(program) {
  const programCard = document.getElementById('program-card');
  const programInfo = document.getElementById('current-program-info');
  
  // OCULTAR la tarjeta también cuando no hay EN VIVO
  programCard.style.display = 'none';
  
  // Mostrar solo el texto del próximo programa
  if (program) {
    programInfo.innerHTML = `📅 <strong>Próximamente:</strong> ${program.name} - ${program.schedule}`;
  } else {
    programInfo.textContent = 'Radio Escolar - Transmisión continua';
  }
  
  const liveIndicator = document.querySelector('.live');
  liveIndicator.style.display = 'none';
  
  // Restaurar el título del reproductor
  const audioPlayerTitle = document.querySelector('.audio-player-title');
  if (audioPlayerTitle) {
    audioPlayerTitle.textContent = 'Radio en Vivo';
  }
  
  // Restaurar stream normal
  restoreNormalStream();
  
  console.log('Mostrando próximo programa:', program ? program.name : 'Ninguno');
}

// Restaurar el stream normal (cuando no hay EN VIVO)
function restoreNormalStream() {
  console.log(' Restaurando streams normales');
  
  const videoIframe = document.getElementById('video-iframe');
  
  // Restaurar AUDIO normal
  if (audio.src !== AUDIO_STREAM) {
    const wasPlaying = !audio.paused;
    audio.src = AUDIO_STREAM;
    if (wasPlaying) {
      audio.play().catch(err => console.log('Error al reanudar audio:', err));
    }
  }
  
  // Ocultar live de YouTube
  if (videoIframe) {
    videoIframe.src = '';
    videoIframe.style.display = 'none';
  }
  
  // Restaurar video normal o mostrar mensaje
  if (VIDEO_STREAM && VIDEO_STREAM.trim() !== '') {
    video.src = VIDEO_STREAM;
    video.style.display = 'block';
    videoMessage.style.display = 'none';
  } else {
    video.src = '';
    video.style.display = 'none';
    videoMessage.style.display = 'flex';
  }
  
  console.log(' Streams restaurados');
}

// Obtener información del programa actual
async function getCurrentProgram(programId) {
  if (!checkFirebase()) return;
  
  try {
    const doc = await programsCollection.doc(programId).get();
    if (doc.exists) {
      const program = doc.data();
      displayCurrentProgram(program);
    }
  } catch (error) {
    console.error("Error al obtener programa actual:", error);
  }
}

// Mostrar información del programa actual 
function displayCurrentProgram(program) {
  const programCard = document.getElementById('program-card');
  const programInfo = document.getElementById('current-program-info');
  
  if (program) {
    programCard.style.display = 'none';
    
    // Cambia el titulo y mostrar EN VIVO
    programInfo.innerHTML = `🔴 <strong>EN VIVO:</strong> ${program.name} - ${program.host}`;
    
    const liveIndicator = document.querySelector('.live');
    liveIndicator.style.display = 'inline-block';
    
    const audioPlayerTitle = document.querySelector('.audio-player-title');
    if (audioPlayerTitle) {
      audioPlayerTitle.textContent = program.name;
    }
    
    if (
  program.liveStreamUrl &&
  program.liveStreamUrl.trim() !== '' &&
  program.isLive === true
) {
  switchToLiveStream(program.liveStreamUrl);
}
    
    console.log(' Mostrando programa EN VIVO:', program.name);
  }
}

// Cambiar al EN VIVO
function switchToLiveStream(streamUrl) {
  console.log('Cambiando a stream EN VIVO:', streamUrl);
  
  const videoIframe = document.getElementById('video-iframe');
  const isYouTube = streamUrl.includes('youtube.com') || streamUrl.includes('youtu.be');
  const isHLS = streamUrl.includes('.m3u8');

  if (isYouTube) {
    console.log(' YouTube detectado → usando iframe');
    
    let videoId = '';

    if (streamUrl.includes('watch?v=')) {
      videoId = streamUrl.split('watch?v=')[1].split('&')[0];
    } 
    else if (streamUrl.includes('/live/')) {
      videoId = streamUrl.split('/live/')[1].split('?')[0];
    } 
    else if (streamUrl.includes('youtu.be/')) {
      videoId = streamUrl.split('youtu.be/')[1].split('?')[0];
    }
    else if (streamUrl.includes('/embed/')) {
      videoId = streamUrl.split('/embed/')[1].split('?')[0];
    }

    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    
    console.log(' Video ID:', videoId);
    console.log(' Embed URL:', embedUrl);

    videoIframe.src = embedUrl;
    videoIframe.style.display = 'block';
    video.style.display = 'none';
    videoMessage.style.display = 'none';

  } else if (isHLS) {
  
    console.log(' Stream HLS detectado → usando video');
    
    video.src = streamUrl;
    video.style.display = 'block';
    videoIframe.style.display = 'none';
    videoMessage.style.display = 'none';
    
    if (videoSection.classList.contains('active')) {
      video.play().catch(err => console.log('Autoplay bloqueado:', err));
    }

  } else {
    
    console.log('Stream de audio detectado');
    if (!audio.paused) audio.pause();
    audio.src = streamUrl;
  }
}

function updateLiveInfo(data) {

  const liveIndicator = document.querySelector('.live');

  if (data.isLive === true) {

    console.log(" HAY LIVE");

    
    if (liveIndicator) {
      liveIndicator.style.display = "inline-block";
    }

    if (data.streamUrl) {

      if (
        data.streamUrl.includes("youtube.com") ||
        data.streamUrl.includes("youtu.be")
      ) {
        switchToLiveStream(data.streamUrl);
      } else {
        audio.src = data.streamUrl;
      }

    }

  } else {

    console.log("NO HAY LIVE");

    if (liveIndicator) {
      liveIndicator.style.display = "none";
    }

    restoreNormalStream();
    audio.src = AUDIO_STREAM;

  }
}

async function getUpcomingPrograms() {

  if (!checkFirebase()) return;

  const upcomingContainer = document.getElementById("programs-list");

  try {

    const snapshot = await db.collection("programs").get();

    const now = new Date();

    let upcomingPrograms = [];

    snapshot.forEach(doc => {

      const program = doc.data();

      if (!program.eventDate || !program.startTime) return;

const programDate = new Date(program.eventDate + "T00:00:00");
const today = new Date();
today.setHours(0,0,0,0);

const programEndTime = new Date(program.eventDate + "T" + program.endTime);
      if (programEndTime > now) {
        upcomingPrograms.push({
          id: doc.id,
          ...program,
          dateTime: programEndTime
        });
      }

    });

    upcomingPrograms.sort((a, b) => a.dateTime - b.dateTime);

    upcomingPrograms = upcomingPrograms.slice(0, 5);

    if (upcomingPrograms.length === 0) {
      upcomingContainer.innerHTML = `
        <p class="no-programs">No hay próximos programas programados.</p>
      `;
      return;
    }

    upcomingContainer.innerHTML = "";

    upcomingPrograms.forEach(program => {

      const programCard = document.createElement("div");
      programCard.className = "upcoming-program";

      programCard.innerHTML = `
        <h4>${program.name}</h4>
        <p>${program.description || ""}</p>
        <span>${program.eventDate} | ${program.startTime}</span>
      `;

      upcomingContainer.appendChild(programCard);

    });

  } catch (error) {

    console.error("Error cargando próximos programas:", error);

  }
}

// Detectar cuando el usuario cambia de pestaña
document.addEventListener('visibilitychange', () => {
});

window.addEventListener('DOMContentLoaded', () => {

  setTimeout(() => {

    if (checkFirebase()) {

      startPresenceSystem();
      listenToPresenceCount();

      getCurrentLiveStatus();
      listenToLiveStatus();  

      getUpcomingPrograms();
      startAutoScheduler();

      setInterval(() => {
        getUpcomingPrograms();
      }, 20000);

      if (chatMessages && chatUsernameInput && chatMessageInput && chatSendBtn) {
        listenToChatMessages();
      }

    }

  }, 1500);

});
  
// Detectar cuando el usuario vuelve a la pestaña
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    console.log("Usuario volvió a la pestaña");

    if (checkFirebase()) {
      startPresenceSystem();
      getCurrentLiveStatus();
    }
  }
});

let schedulerInterval = null;

// Iniciar el sistema que revisa cada minuto
function startAutoScheduler() {
  if (!checkFirebase()) return;
  
  console.log(' Sistema de automatización iniciado');
  
  // Revisar inmediatamente
  checkScheduledPrograms();
  
  // Revisar cada 30 segundos
  schedulerInterval = setInterval(() => {
    checkScheduledPrograms();
  }, 30000);
}

async function checkScheduledPrograms() {
  if (!checkFirebase()) return;

  try {
    const now = new Date();

    const snapshot = await db.collection('programs')
      .where('autoLive', '==', true)
      .get();

    let shouldBeLive = null;
    let currentAutoProgram = null;

    snapshot.forEach(doc => {
      const program = { id: doc.id, ...doc.data() };

      if (!program.eventDate || !program.startTime || !program.endTime) return;

      const start = new Date(`${program.eventDate}T${program.startTime}`);
      const end = new Date(`${program.eventDate}T${program.endTime}`);

      if (now >= start && now <= end) {
        shouldBeLive = program;
      }

      if (now > end && program.isLive === true) {
        currentAutoProgram = program;
      }
    });

    const liveDoc = await db.collection('liveStatus').doc('current').get();
    const liveData = liveDoc.exists ? liveDoc.data() : null;

    if (shouldBeLive && (!liveData || !liveData.isLive)) {
      await activateLiveProgram(shouldBeLive);
    }

    if (
      currentAutoProgram &&
      liveData &&
      liveData.isLive === true &&
      liveData.currentProgram === currentAutoProgram.id
    ) {
      await deactivateLiveProgram(currentAutoProgram);
    }

  } catch (error) {
    console.error('Error en scheduler:', error);
  }
}

async function activateLiveProgram(program) {
  try {

    const doc = await db.collection('programs').doc(program.id).get();
    if (doc.exists && doc.data().isLive) {
      return;
    }

    console.log(` Activando EN VIVO: ${program.name}`);

    const allPrograms = await db.collection('programs').get();
    const batch = db.batch();
    allPrograms.forEach(doc => {
      batch.update(doc.ref, { isLive: false });
    });
    await batch.commit();

    await db.collection('programs').doc(program.id).update({ isLive: true });

    const streamUrl = program.liveStreamUrl || AUDIO_STREAM;

    await db.collection('liveStatus').doc('current').set({
      isLive: true,
      currentProgram: program.id,
      streamUrl: streamUrl,
      startedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(` ${program.name} activado correctamente`);

  } catch (error) {
    console.error('Error al activar programa:', error);
  }
}

async function deactivateLiveProgram(program) {
  try {
    console.log(` Finalizando: ${program.name}`);
    
    await db.collection('programs').doc(program.id).update({ isLive: false });
    
    await db.collection('liveStatus').doc('current').update({
      isLive: false,
      currentProgram: null,
      listenerCount: 0
    });
    
    console.log(` ${program.name} finalizado automáticamente`);
    
  } catch (error) {
    console.error('Error al finalizar programa:', error);
  }
}

// CONTADOR CON REALTIME DATABASE en firebase
let presenceStarted = false;

function startPresenceSystem() {

  if (presenceStarted) return; 
  presenceStarted = true;

  const database = firebase.database();

  let userId = sessionStorage.getItem("liveUserId");

  if (!userId) {
    userId = "user_" + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem("liveUserId", userId);
  }

  const userRef = database.ref("liveViewers/" + userId);

  userRef.set(true);

  userRef.onDisconnect().remove();

  console.log("👤 Usuario registrado:", userId);
}

function listenToPresenceCount() {
  if (!checkFirebase()) return;

  const viewersRef = rtdb.ref("liveViewers");

  viewersRef.on("value", (snapshot) => {
    const data = snapshot.val();
    const count = data ? Object.keys(data).length : 0;

    const counterElement = document.getElementById("listeners");
    if (counterElement) {
      counterElement.textContent = count;
    }

    console.log("👥 Oyentes actuales:", count);
  });
}
// CHAT EN VIVO//
const chatMessages = document.getElementById('chat-messages');
const chatUsernameInput = document.getElementById('chat-username');
const chatMessageInput = document.getElementById('chat-message');
const chatSendBtn = document.getElementById('chat-send');
const onlineCountEl = document.getElementById('online-count');

let chatUnsubscribe = null;

// Cargar nombre de usuario guardado
const savedUsername = localStorage.getItem('chatUsername');
if (savedUsername) {
  chatUsernameInput.value = savedUsername;
}

// Enviar mensaje
chatSendBtn.addEventListener('click', sendChatMessage);
chatMessageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendChatMessage();
  }
});

async function sendChatMessage() {
  if (!checkFirebase()) {
    alert('El chat requiere Firebase configurado');
    return;
  }

  const username = chatUsernameInput.value.trim();
  const message = chatMessageInput.value.trim();

  if (!username) {
    alert('Por favor ingresa tu nombre');
    chatUsernameInput.focus();
    return;
  }

  if (!message) {
    return;
  }

  // Guardar nombre de usuario
  localStorage.setItem('chatUsername', username);
  
  // BLOQUEAR EL nOMBRE DESPUÉS DEL PRIMER MENSAJE
  chatUsernameInput.disabled = true;
  chatUsernameInput.style.opacity = '0.6';
  chatSendBtn.disabled = true;
  chatSendBtn.textContent = 'Enviando...';

  try {
    await db.collection('chatMessages').add({
      userName: username,
      message: message,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      isModerated: true,
      reactions: {
        hearts: 0,
        likes: 0
      }
    });

    chatMessageInput.value = '';
    chatMessageInput.focus();

  } catch (error) {
    console.error(' Error al enviar mensaje:', error);
    alert('Error al enviar mensaje: ' + error.message);
  } finally {
    chatSendBtn.disabled = false;
    chatSendBtn.textContent = 'Enviar';
  }
}

  // mensajes en tiempo real
function listenToChatMessages() {
  if (!checkFirebase()) return;

  chatUnsubscribe = db.collection('chatMessages')
    .orderBy('timestamp', 'desc')
    .limit(50)
    .onSnapshot((snapshot) => {

      chatMessages.innerHTML = '';

      snapshot.forEach(doc => {
        const msg = doc.data();

        console.log("Mensaje recibido:", msg);

        if (!msg.userName || !msg.message) return;

        addMessageToChat(msg);
      });

      if (snapshot.empty) {
        chatMessages.innerHTML =
          '<div class="chat-welcome"><p>¡Bienvenido al chat! 👋</p></div>';
      }

    }, (error) => {
      console.error('Error al escuchar chat:', error);
    });
}

// Agregar mensaje al chat
function addMessageToChat(msg) {
  const welcome = chatMessages.querySelector('.chat-welcome');
  if (welcome) {
    welcome.remove();
  }

  let messageAge = 0;

  if (msg.timestamp && msg.timestamp.toDate) {
    messageAge = Date.now() - msg.timestamp.toDate().getTime();
  }

  // Si el mensaje tiene más de 10 minutos, NO mostrarlo
  if (messageAge > 600000) {
    console.log(' Mensaje antiguo no mostrado (más de 10 min)');
    return;
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message';

  const timeSpan = document.createElement('span');
  timeSpan.className = 'chat-message-time';
  
  // Función para actualizar el tiempo
  function updateTime() {
    if (msg.timestamp && msg.timestamp.toDate) {
      timeSpan.textContent = formatChatTime(msg.timestamp.toDate());
    } else {
      timeSpan.textContent = 'Ahora';
    }
  }
  
  updateTime();
  const timeInterval = setInterval(updateTime, 30000);

  messageDiv.innerHTML = `
    <div class="chat-message-header">
      <span class="chat-message-user">${escapeHtml(msg.userName)}</span>
    </div>
    <div class="chat-message-text">${escapeHtml(msg.message)}</div>
  `;
  
  messageDiv.querySelector('.chat-message-header').appendChild(timeSpan);
      chatMessages.appendChild(messageDiv);
  
  const isAtBottom =
   chatMessages.scrollHeight - chatMessages.scrollTop <= chatMessages.clientHeight + 50;
        if (isAtBottom) {
           chatMessages.scrollTop = chatMessages.scrollHeight;
}
  // BORRAR MENSAJE DESPUÉS de 10 minutos
  const timeRemaining = Math.max(0, 600000 - messageAge);
  setTimeout(() => {
    if (messageDiv && messageDiv.parentNode) {
      clearInterval(timeInterval); 
      messageDiv.remove();
      console.log(' Mensaje eliminado después de 10 minutos');
    }
  }, timeRemaining);

  const messages = chatMessages.querySelectorAll('.chat-message');
  if (messages.length > 50) {
    messages[messages.length - 1].remove();
  }
}

function formatChatTime(date) {
  const now = new Date();
  const diffMinutes = Math.floor((now - date) / 60000);

  if (diffMinutes < 1) return 'Ahora';
  if (diffMinutes < 60) return `Hace ${diffMinutes}m`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours}h`;
  
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}