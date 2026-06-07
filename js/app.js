// ==========================================
// НАСТРОЙКА БАЗЫ ДАННЫХ ДЛЯ КОММЕНТАРИЕВ
// ==========================================
// Для синхронизации воспоминаний между всеми пользователями:
// 1. Создайте проект в Supabase (supabase.com)
// 2. Создайте таблицу "memories" с полями id (bigint), name (text), message (text), created_at (timestamp)
// 3. Раскомментируйте скрипт Supabase SDK внизу файла index.html
// 4. Установите useSupabase: true и впишите ваши параметры подключения ниже:
const MEMORY_DB_CONFIG = {
    useSupabase: true,
    supabaseUrl: 'https://gobbzehbalrsytatbkub.supabase.co',
    supabaseKey: 'sb_publishable_gezOMVVM2-kEcE-3LLUEnA_Ljl6eA2e'
};

let supabaseClient = null;
if (MEMORY_DB_CONFIG.useSupabase) {
    if (typeof supabase !== 'undefined') {
        // pyrefly: ignore [undefined-name]
        supabaseClient = supabase.createClient(MEMORY_DB_CONFIG.supabaseUrl, MEMORY_DB_CONFIG.supabaseKey);
    } else {
        console.warn("Supabase SDK не обнаружен. Проверьте подключение скрипта в index.html");
    }
}

// Book Logic
let currentLocation = 1;
let numOfPapers = 0;

function updateBookState() {
    const book = document.getElementById("book");
    if (!book) return;
    
    book.classList.remove("at-start", "at-end");
    
    if (currentLocation === 1) {
        book.style.setProperty("--book-shift", "-25%");
        book.classList.add("at-start");
    } else {
        book.style.setProperty("--book-shift", "0%");
    }

    // Manage active pages for corner folds
    const papers = document.querySelectorAll(".paper");
    papers.forEach((paper, idx) => {
        paper.classList.remove("active-left", "active-right");
        
        // Flipped paper at index (currentLocation - 2) is shown on the left
        if (idx === currentLocation - 2) {
            paper.classList.add("active-left");
        }
        
        // Unflipped paper at index (currentLocation - 1) is shown on the right
        // We do not activate the corner fold for the last page of the book (index numOfPapers - 1)
        if (idx === currentLocation - 1 && idx < papers.length - 1) {
            paper.classList.add("active-right");
        }
    });
}

function goNextPage() {
    // Disable book flipping on mobile viewports
    if (window.innerWidth <= 768) return;

    const papers = document.querySelectorAll(".paper");
    const numOfPapers = papers.length;
    
    // Only allow flipping if we haven't reached the last paper (which is the back cover/end state)
    if (currentLocation < numOfPapers) {
        let paper = papers[currentLocation - 1];
        paper.classList.add("flipped");
        paper.style.zIndex = currentLocation;
        currentLocation++;
        updateBookState();
    }
}

function goPrevPage() {
    // Disable book flipping on mobile viewports
    if (window.innerWidth <= 768) return;

    const papers = document.querySelectorAll(".paper");
    const numOfPapers = papers.length;
    
    if (currentLocation > 1) {
        currentLocation--;
        let paper = papers[currentLocation - 1];
        paper.classList.remove("flipped");
        paper.style.zIndex = numOfPapers - currentLocation + 1;
        updateBookState();
    }
}

// Scroll animations & initialization
document.addEventListener("DOMContentLoaded", () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in').forEach((el) => {
        observer.observe(el);
    });

    const papersList = document.querySelectorAll(".paper");
    numOfPapers = papersList.length;

    // Initialize z-index
    papersList.forEach((paper, index) => {
        paper.style.zIndex = numOfPapers - index;
    });
    
    updateBookState();
    
    // Загрузка воспоминаний
    loadMemories();

    // Set up audio end handler to toggle icons back to play mode
    const audio = document.getElementById('site-audio');
    if (audio) {
        audio.addEventListener('ended', () => {
            const playIcon = document.getElementById('audio-icon-play');
            const pauseIcon = document.getElementById('audio-icon-pause');
            if (playIcon && pauseIcon) {
                playIcon.style.display = 'block';
                pauseIcon.style.display = 'none';
            }
        });
    }
});

// Lightbox
function openLightbox(element) {
    const imgSrc = element.tagName === 'IMG' ? element.src : element.querySelector('img').src;
    let capText = '';
    
    // Check if it's a polaroid with a paragraph caption
    if(element.tagName !== 'IMG') {
        const p = element.querySelector('p');
        if (p && !p.classList.contains('instruction')) {
            capText = p.textContent;
        }
    }

    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCap = document.getElementById('lightbox-caption');
    
    lightboxImg.src = imgSrc;
    lightboxCap.textContent = capText;
    lightbox.classList.add('active');
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
}

// Вспомогательные функции для локального хранилища (localStorage fallback)
function getLocalMemories() {
    try {
        const stored = localStorage.getItem('avito_memories');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Ошибка чтения localStorage:", e);
        return [];
    }
}

function saveLocalMemory(name, message) {
    try {
        const memories = getLocalMemories();
        memories.unshift({ name, message, created_at: new Date().toISOString() });
        localStorage.setItem('avito_memories', JSON.stringify(memories));
    } catch (e) {
        console.error("Ошибка записи в localStorage:", e);
    }
}

function addMemoryToDOM(name, message, animate = false) {
    const list = document.getElementById('memory-list');
    if (!list) return;
    
    const entry = document.createElement('div');
    entry.className = 'memory-card';
    if (animate) {
        entry.classList.add('fade-in');
    } else {
        entry.classList.add('visible');
    }
    
    entry.innerHTML = `<p class="memory-text">«${message}»</p><p class="memory-author">— ${name}</p>`;
    
    // Добавляем в начало списка воспоминаний (над стандартными)
    list.insertBefore(entry, list.firstChild);
    
    if (animate) {
        setTimeout(() => {
            entry.classList.add('visible');
        }, 50);
    }
}

// Загрузка воспоминаний из Supabase или localStorage
async function loadMemories() {
    let memories = [];
    
    if (supabaseClient) {
        try {
            // pyrefly: ignore [missing-attribute]
            const { data, error } = await supabaseClient
                .from('memories')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            memories = data || [];
        } catch (err) {
            console.error("Не удалось загрузить воспоминания из Supabase, используем localStorage:", err);
            memories = getLocalMemories();
        }
    } else {
        memories = getLocalMemories();
    }
    
    // Выводим воспоминания на экран в хронологическом порядке (чтобы новые были сверху при вставке)
    // Так как insertBefore вставляет элемент в самое начало, мы обходим массив с конца к началу (от старых к новым)
    for (let i = memories.length - 1; i >= 0; i--) {
        addMemoryToDOM(memories[i].name, memories[i].message, false);
    }
}

// Отправка воспоминания
async function submitMemory(event) {
    event.preventDefault();
    const nameEl = document.getElementById('name');
    const messageEl = document.getElementById('message');
    if (!nameEl || !messageEl) return;
    
    const name = nameEl.value.trim();
    const message = messageEl.value.trim();
    
    if (!name || !message) return;
    
    // Отображаем на клиенте моментально
    addMemoryToDOM(name, message, true);
    
    // Очищаем форму
    nameEl.value = '';
    messageEl.value = '';
    
    // Сохраняем в Supabase или в localStorage
    if (supabaseClient) {
        try {
            const { error } = await supabaseClient
                .from('memories')
                // pyrefly: ignore [missing-attribute]
                .insert([{ name, message }]);
                
            if (error) throw error;
        } catch (err) {
            console.error("Не удалось отправить в Supabase, сохраняем локально:", err);
            saveLocalMemory(name, message);
        }
    } else {
        saveLocalMemory(name, message);
    }
}

// Audio Control
function toggleAudio() {
    const audio = document.getElementById('site-audio');
    const playIcon = document.getElementById('audio-icon-play');
    const pauseIcon = document.getElementById('audio-icon-pause');

    if (!audio) return;

    if (audio.paused) {
        audio.play().catch(e => console.error("Audio play failed:", e));
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    } else {
        audio.pause();
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }
}
