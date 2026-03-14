// app.js - Lógica principal

let gameData = null;
let currentChapter = null;
let currentMission = null;
let currentStepIndex = 0;
let playerProgress = {
    level: 1,
    experience: 0,
    badges: [],
    completedMissions: [],
    chapterProgress: {}
};

// Cargar datos JSON
async function loadGameData() {
    try {
        const response = await fetch('data/knowledge.json');
        gameData = await response.json();
        
        // Cargar progreso guardado
        loadProgress();
        
        // Inicializar UI
        document.getElementById('splash-screen').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        
        renderChapters();
        updatePlayerInfo();
    } catch (error) {
        console.error('Error cargando datos:', error);
        document.getElementById('splash-screen').innerHTML = `
            <h1>😕 Error</h1>
            <p>No se pudo cargar el conocimiento. ¿Están los archivos en su lugar?</p>
        `;
    }
}

// Guardar progreso en LocalStorage
function saveProgress() {
    localStorage.setItem('survivalJournalProgress', JSON.stringify(playerProgress));
}

// Cargar progreso de LocalStorage
function loadProgress() {
    const saved = localStorage.getItem('survivalJournalProgress');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            playerProgress = {...playerProgress, ...parsed};
        } catch (e) {
            console.log('Error cargando progreso guardado');
        }
    }
}

// Actualizar información del jugador en UI
function updatePlayerInfo() {
    document.getElementById('player-level').textContent = `Nivel ${playerProgress.level}`;
    document.getElementById('player-xp').textContent = `✨ ${playerProgress.experience} XP`;
    document.getElementById('player-badges').textContent = `🏅 ${playerProgress.badges.length}`;
}

// Renderizar grid de capítulos
function renderChapters() {
    const container = document.getElementById('chapter-selector');
    container.innerHTML = '';
    
    gameData.chapters.forEach(chapter => {
        const completed = playerProgress.completedMissions.filter(
            m => m.startsWith(chapter.id)
        ).length;
        const total = chapter.missions.length;
        const progress = total > 0 ? (completed / total) * 100 : 0;
        
        const card = document.createElement('div');
        card.className = 'chapter-card';
        card.innerHTML = `
            <div class="chapter-icon">${chapter.icon}</div>
            <div class="chapter-title">${chapter.title}</div>
            <div class="chapter-age">Edad: ${chapter.ageRange}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <div style="margin-top: 10px; color: #666;">
                ${completed}/${total} misiones
            </div>
        `;
        
        card.addEventListener('click', () => openChapter(chapter));
        container.appendChild(card);
    });
}

// Abrir un capítulo y mostrar sus misiones
function openChapter(chapter) {
    currentChapter = chapter;
    document.getElementById('chapter-selector').style.display = 'none';
    document.getElementById('mission-view').style.display = 'block';
    
    renderMissionList();
}

// Renderizar lista de misiones de un capítulo
function renderMissionList() {
    const container = document.getElementById('mission-content');
    
    let html = `<h2>${currentChapter.icon} ${currentChapter.title}</h2>`;
    
    currentChapter.missions.forEach((mission, index) => {
        const isCompleted = playerProgress.completedMissions.includes(
            `${currentChapter.id}_${mission.id}`
        );
        
        html += `
            <div class="chapter-card" style="margin: 10px 0; ${isCompleted ? 'opacity: 0.7;' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3>${mission.title}</h3>
                        ${isCompleted ? '✅ Completada' : ''}
                    </div>
                    <button class="option-btn" onclick="startMission(${index})">
                        ${isCompleted ? 'Repasar' : 'Comenzar'}
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Iniciar una misión específica
function startMission(missionIndex) {
    currentMission = currentChapter.missions[missionIndex];
    currentStepIndex = 0;
    
    renderCurrentStep();
}

// Renderizar el paso actual de la misión
function renderCurrentStep() {
    if (!currentMission || currentStepIndex >= currentMission.steps.length) {
        // Misión completada
        completeMission();
        return;
    }
    
    const step = currentMission.steps[currentStepIndex];
    let html = `
        <button class="back-btn" onclick="backToMissionList()">← Volver a misiones</button>
        <h3>${currentMission.title}</h3>
        <div class="step-container">
            <div class="step-instruction">📖 Paso ${currentStepIndex + 1}: ${step.instruction}</div>
            <div class="step-image">${step.image}</div>
    `;
    
    // Materiales si existen
    if (step.materials) {
        html += `
            <div class="materials-list">
                <h4>📦 Materiales necesarios:</h4>
                <ul>
                    ${step.materials.map(m => `<li>${m}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    // Pasos detallados si existen
    if (step.steps) {
        html += `
            <div class="materials-list">
                <h4>📋 Pasos detallados:</h4>
                <ol>
                    ${step.steps.map(s => `<li>${s}</li>`).join('')}
                </ol>
            </div>
        `;
    }
    
    // Tabla si existe
    if (step.table) {
        html += `
            <div class="materials-list">
                <h4>📊 Tabla de referencia:</h4>
                <ul>
                    ${step.table.map(row => `<li>${row.color}: ${row.vitamina}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    // Advertencia si existe
    if (step.warning) {
        html += `<div class="warning">⚠️ ${step.warning}</div>`;
    }
    
    // Pregunta si existe
    if (step.question) {
        html += `
            <div class="step-question">
                <div class="question-text">❓ ${step.question}</div>
                <div class="options" id="question-options">
                    ${step.options.map((opt, idx) => `
                        <button class="option-btn" onclick="checkAnswer(${idx})">${opt}</button>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        // Si no hay pregunta, botón para siguiente paso
        html += `<button class="option-btn" onclick="nextStep()">Continuar →</button>`;
    }
    
    // Fun fact si existe
    if (step.funFact) {
        html += `<div class="fun-fact">🌟 Sabías que: ${step.funFact}</div>`;
    }
    
    html += `</div>`;
    
    document.getElementById('mission-content').innerHTML = html;
}

// Verificar respuesta del usuario
function checkAnswer(selectedIndex) {
    const step = currentMission.steps[currentStepIndex];
    const options = document.querySelectorAll('#question-options .option-btn');
    
    // Deshabilitar todos los botones después de responder
    options.forEach(btn => {
        btn.disabled = true;
    });
    
    if (selectedIndex === step.correct) {
        options[selectedIndex].classList.add('correct');
        
        // Dar experiencia si es correcto
        playerProgress.experience += 10;
        updatePlayerInfo();
        saveProgress();
        
        // Botón para continuar
        setTimeout(() => {
            nextStep();
        }, 1500);
    } else {
        options[selectedIndex].classList.add('incorrect');
        options[step.correct].classList.add('correct');
        
        // Mensaje de error, pero permitir reintentar después de un momento
        setTimeout(() => {
            options.forEach(btn => {
                btn.disabled = false;
                btn.classList.remove('correct', 'incorrect');
            });
        }, 2000);
    }
}

// Ir al siguiente paso
function nextStep() {
    currentStepIndex++;
    renderCurrentStep();
}

// Completar una misión
function completeMission() {
    const missionId = `${currentChapter.id}_${currentMission.id}`;
    
    if (!playerProgress.completedMissions.includes(missionId)) {
        playerProgress.completedMissions.push(missionId);
        
        // Dar recompensa
        if (currentMission.reward) {
            playerProgress.experience += currentMission.reward.experience || 0;
            if (currentMission.reward.badge) {
                playerProgress.badges.push(currentMission.reward.badge);
            }
        }
        
        // Subir de nivel si corresponde (cada 500 XP)
        const newLevel = Math.floor(playerProgress.experience / 500) + 1;
        if (newLevel > playerProgress.level) {
            playerProgress.level = newLevel;
        }
        
        saveProgress();
        updatePlayerInfo();
    }
    
    document.getElementById('mission-content').innerHTML = `
        <button class="back-btn" onclick="backToMissionList()">← Volver a misiones</button>
        <div style="text-align: center; padding: 50px;">
            <div style="font-size: 5rem;">🎉</div>
            <h2>¡Misión Completada!</h2>
            ${currentMission.reward ? `
                <p>Has ganado:</p>
                ${currentMission.reward.badge ? `<p>🏅 ${currentMission.reward.badge}</p>` : ''}
                <p>✨ +${currentMission.reward.experience || 0} XP</p>
            ` : ''}
            <button class="option-btn" onclick="backToMissionList()" style="margin-top: 20px;">
                Continuar aprendiendo
            </button>
        </div>
    `;
}

// Volver a la lista de misiones
function backToMissionList() {
    renderMissionList();
}

// Volver a la selección de capítulos
document.getElementById('back-to-chapters').addEventListener('click', () => {
    document.getElementById('chapter-selector').style.display = 'grid';
    document.getElementById('mission-view').style.display = 'none';
    currentChapter = null;
    currentMission = null;
});

// Menú toggle (mostrar/ocultar capítulos en móvil)
document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('chapter-selector').style.display = 'grid';
    document.getElementById('mission-view').style.display = 'none';
});

// Iniciar la app cuando cargue la página
window.addEventListener('load', () => {
    loadGameData();
});

// Hacer funciones globales para los onclick
window.startMission = startMission;
window.checkAnswer = checkAnswer;
window.nextStep = nextStep;
window.backToMissionList = backToMissionList;
