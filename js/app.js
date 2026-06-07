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
    loadAllComments();

    // Инициализация первой награды во вкладках
    if (typeof showAward === 'function') {
        showAward(0);
    }

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
    
    // Check if it's a polaroid with a paragraph caption or an award with an img-label
    if (element.tagName !== 'IMG') {
        const p = element.querySelector('p');
        if (p && !p.classList.contains('instruction')) {
            capText = p.textContent;
        } else {
            const label = element.querySelector('.img-label');
            if (label) {
                const activeTab = document.querySelector('.award-tab.active .award-tab-title');
                const awardTitle = activeTab ? activeTab.textContent : '';
                capText = awardTitle ? `${awardTitle} — ${label.textContent}` : label.textContent;
            }
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

// Вспомогательные функции для локального хранилища (localStorage fallback) по разделам
function getLocalSectionComments(sectionId) {
    try {
        const key = sectionId === 'general' ? 'avito_memories' : `avito_memories_${sectionId}`;
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error(`Ошибка чтения localStorage для ${sectionId}:`, e);
        return [];
    }
}

function saveLocalSectionComment(sectionId, name, message) {
    try {
        const key = sectionId === 'general' ? 'avito_memories' : `avito_memories_${sectionId}`;
        const comments = getLocalSectionComments(sectionId);
        comments.unshift({
            name,
            message,
            section_id: sectionId,
            created_at: new Date().toISOString()
        });
        localStorage.setItem(key, JSON.stringify(comments));
    } catch (e) {
        console.error(`Ошибка записи в localStorage для ${sectionId}:`, e);
    }
}

// Слияние комментариев из БД и локального хранилища без дубликатов
function mergeComments(dbList, localList) {
    const seen = new Set();
    const result = [];
    
    // Сначала добавляем из БД (они приоритетнее)
    dbList.forEach(c => {
        const key = `${c.name}_${c.message}`;
        if (!seen.has(key)) {
            seen.add(key);
            result.push(c);
        }
    });
    
    // Добавляем локальные, если их нет в БД
    localList.forEach(c => {
        const key = `${c.name}_${c.message}`;
        if (!seen.has(key)) {
            seen.add(key);
            result.push(c);
        }
    });
    
    // Сортируем по дате создания в обратном порядке
    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return result;
}

// Вывод комментариев на страницу
function renderComments(sectionId, comments) {
    if (sectionId === 'general') {
        const list = document.getElementById('memory-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        // Рендерим загруженные комментарии
        comments.forEach(c => {
            const card = document.createElement('div');
            card.className = 'memory-card visible';
            card.innerHTML = `<p class="memory-text">«${c.message}»</p><p class="memory-author">— ${c.name}</p>`;
            list.appendChild(card);
        });
        
        // Статические моки воспоминаний (остаются внизу гостевой книги)
        const mock1 = document.createElement('div');
        mock1.className = 'memory-card visible';
        mock1.innerHTML = `<p class="memory-text">«Юрген обладал нереальной смелостью, терпеливостью и храбростью. Он неоднократно штурмовал опорные пункты врага, никогда не хвастался и не восхвалял себя, вел себя сдержанно и скромно. До сих пор не могу поверить, что его нет...»</p><p class="memory-author">— Сослуживец и друг</p>`;
        list.appendChild(mock1);

        const mock2 = document.createElement('div');
        mock2.className = 'memory-card visible';
        mock2.innerHTML = `<p class="memory-text">«Юра всегда красиво ухаживал: цветы, подарки, никогда не давал носить тяжелые пакеты. Он говорил, что женщины не созданы для тяжестей. Наш сын Тёмка будет расти и гордиться своим отцом-героем, который пошел защищать нашу Родину.»</p><p class="memory-author">— Супруга Ксения</p>`;
        list.appendChild(mock2);
    } else {
        const listEl = document.getElementById(`list-${sectionId}`);
        const countEl = document.getElementById(`count-${sectionId}`);
        if (!listEl) return;
        
        if (countEl) {
            countEl.textContent = `(${comments.length})`;
        }
        
        listEl.innerHTML = '';
        if (comments.length === 0) {
            listEl.innerHTML = `<p style="text-align: center; color: var(--text-light-muted); font-size: 0.9rem; padding: 15px 0; margin: 0; width: 100%;">Пока нет воспоминаний в этом разделе. Будьте первыми!</p>`;
        } else {
            comments.forEach(c => {
                const card = document.createElement('div');
                card.className = 'section-comment-card';
                card.innerHTML = `
                    <p class="section-comment-text">«${c.message}»</p>
                    <p class="section-comment-author">— ${c.name}</p>
                `;
                listEl.appendChild(card);
            });
        }
    }
}

// Загрузка всех комментариев
async function loadAllComments() {
    let dbComments = [];
    if (supabaseClient) {
        try {
            // pyrefly: ignore [missing-attribute]
            const { data, error } = await supabaseClient
                .from('memories')
                .select('*')
                .order('created_at', { ascending: false });
            if (!error && data) {
                dbComments = data;
            } else if (error) {
                console.error("Ошибка Supabase при загрузке комментариев:", error);
            }
        } catch (err) {
            console.error("Исключение при загрузке комментариев из Supabase:", err);
        }
    }

    const sections = ['bio', 'awards', 'stories', 'gallery', 'general'];
    sections.forEach(sectionId => {
        const localComments = getLocalSectionComments(sectionId);
        const sectionDbComments = dbComments.filter(c => {
            const sId = c.section_id || 'general';
            return sId === sectionId;
        });

        const merged = mergeComments(sectionDbComments, localComments);
        renderComments(sectionId, merged);
    });
}

// Вставка комментария в Supabase с автоматическим fallback при отсутствии колонки section_id
async function insertCommentToSupabase(name, message, sectionId) {
    if (!supabaseClient) return false;
    try {
        // Пробуем вставить с указанием раздела
        // pyrefly: ignore [missing-attribute]
        const { error } = await supabaseClient
            .from('memories')
            .insert([{ name, message, section_id: sectionId }]);
            
        if (!error) return true;
        
        // Если ошибка говорит об отсутствии колонки, пробуем вставить без неё
        console.warn("Ошибка вставки с section_id, сохраняем как общее воспоминание в БД:", error);
        // pyrefly: ignore [missing-attribute]
        const { error: retryError } = await supabaseClient
            .from('memories')
            .insert([{ name, message }]);
            
        if (!retryError) return true;
        throw retryError;
    } catch (err) {
        console.error("Не удалось сохранить в БД:", err);
        return false;
    }
}

// Отправка воспоминания в общем разделе
async function submitMemory(event) {
    event.preventDefault();
    const nameEl = document.getElementById('name');
    const messageEl = document.getElementById('message');
    if (!nameEl || !messageEl) return;
    
    const name = nameEl.value.trim();
    const message = messageEl.value.trim();
    if (!name || !message) return;
    
    nameEl.value = '';
    messageEl.value = '';
    
    // Локально сохраняем мгновенно для быстрой реакции интерфейса
    saveLocalSectionComment('general', name, message);
    await loadAllComments();
    
    // Синхронизируем с Supabase в фоне
    await insertCommentToSupabase(name, message, 'general');
    await loadAllComments();
}

// Отправка комментария к подразделу
async function submitSectionComment(event, sectionId) {
    event.preventDefault();
    const form = event.target;
    const nameEl = form.querySelector('.comment-name-input');
    const messageEl = form.querySelector('.comment-text-input');
    if (!nameEl || !messageEl) return;
    
    const name = nameEl.value.trim();
    const message = messageEl.value.trim();
    if (!name || !message) return;
    
    nameEl.value = '';
    messageEl.value = '';
    
    // Локально сохраняем мгновенно
    saveLocalSectionComment(sectionId, name, message);
    await loadAllComments();
    
    // Синхронизируем с Supabase
    await insertCommentToSupabase(name, message, sectionId);
    await loadAllComments();
}

// Показ/скрытие панели комментариев
function toggleSectionComments(sectionId) {
    const pane = document.getElementById(`pane-${sectionId}`);
    if (!pane) return;
    
    if (pane.style.display === 'none' || !pane.style.display) {
        pane.style.display = 'block';
    } else {
        pane.style.display = 'none';
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

// Awards Tab Logic
const AWARDS_DATA = [
    {
        title: "Орден Мужества (I)",
        meta: "Указ Президента РФ от 30 ноября 2023 г. • Орден № 149784",
        desc: "Юрий Юрьевич Бесчастнов был удостоен этой высокой государственной награды за мужество, отвагу и самоотверженность, проявленные при исполнении воинского долга в ходе сложнейших штурмовых действий на передовой.",
        images: [
            { src: "img/medal_courage.jpg", label: "Медаль" },
            { src: "img/cert_courage_order.jpg", label: "Удостоверение" }
        ]
    },
    {
        title: "Орден Мужества (II, Посмертно)",
        meta: "Указ Президента РФ (2026 г.) • Посмертно",
        desc: "Награжден посмертно за героизм, проявленный при выполнении боевой задачи в районе проведения СВО 22 января 2026 года. Юрий шёл впереди своей группы БПЛА, защищая товарищей и выполнив свой долг перед Родиной до конца.",
        images: [
            { src: "img/medal_courage.jpg", label: "Медаль" }
        ]
    },
    {
        title: "Медаль «За отвагу»",
        meta: "Указ Президента РФ от 30 мая 2024 г. • Медаль № 211270",
        desc: "Государственная награда Российской Федерации, вручаемая за личное мужество и храбрость, проявленные в боях и при выполнении специальных задач по обеспечению государственной безопасности.",
        images: [
            { src: "img/cert_courage_medal.jpg", label: "Удостоверение" }
        ]
    },
    {
        title: "Медаль Суворова",
        meta: "Указ Президента РФ от 11 октября 2022 г. • Награда № 67392",
        desc: "Присуждается военнослужащим за личное мужество и отвагу, проявленные при защите Отечества и государственных интересов Российской Федерации в ходе боевых действий на суше.",
        images: [
            { src: "img/medal_suvorov.jpg", label: "Медаль" },
            { src: "img/cert_suvorov.jpg", label: "Удостоверение" }
        ]
    },
    {
        title: "Медаль «За боевые отличия»",
        meta: "Приказ Министра обороны РФ от 24 апреля 2018 г. • Награда № 19",
        desc: "Ведомственная награда Министерства обороны РФ, которой награждаются военнослужащие Вооруженных Сил за отличие, отвагу и самоотверженность, проявленные при выполнении задач в боевых условиях.",
        images: [
            { src: "img/medal_combat_distinction.jpg", label: "Медаль" },
            { src: "img/cert_combat_distinction.jpg", label: "Удостоверение" }
        ]
    },
    {
        title: "Медаль участника операции в Сирии",
        meta: "Приказ Министра обороны РФ (2020 г.)",
        desc: "Вручена Юрию Бесчастнову за успешное выполнение специальных задач в ходе военной операции Вооруженных Сил РФ в Сирийской Арабской Республике.",
        images: [
            { src: "img/medal_syria.jpg", label: "Медаль" },
            { src: "img/boevye_tovarishi_1.jpg", label: "Фото службы" }
        ]
    },
    {
        title: "Нагрудный знак «Гвардия»",
        meta: "Почетный знак отличия",
        desc: "Нагрудный знак «Гвардия» вручается военнослужащим воинских частей, удостоенных почетного звания «гвардейских», за высокое воинское мастерство, доблесть и образцовую службу.",
        images: [
            { src: "img/medal_guard.jpg", label: "Знак «Гвардия»" }
        ]
    }
];

function showAward(index) {
    const tabs = document.querySelectorAll('.award-tab');
    tabs.forEach((tab, idx) => {
        if (idx === index) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    const panel = document.querySelector('.award-details-panel');
    if (!panel) return;

    const data = AWARDS_DATA[index];
    
    // Формируем HTML для изображений награды
    let mediaHTML = '';
    if (data.images && data.images.length > 0) {
        mediaHTML = `
            <div class="award-media">
                ${data.images.map(img => `
                    <div class="award-media-item" onclick="openLightbox(this)">
                        <img src="${img.src}" alt="${data.title}">
                        <span class="img-label">${img.label}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    panel.innerHTML = `
        <div class="award-info">
            <h3>${data.title}</h3>
            <div class="award-meta">${data.meta}</div>
            <p class="award-desc">${data.desc}</p>
        </div>
        ${mediaHTML}
    `;
}
