<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ULTRON OS | Live Analysis & Smart Zoom</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        :root {
            /* نظام الألوان الزجاجي */
            --bg-color: #0f1115;
            --glass-bg: rgba(30, 32, 40, 0.75);
            --glass-border: rgba(255, 255, 255, 0.08);
            --neon-cyan: #00f2ff;
            --neon-green: #22c55e;
            --text-primary: #f3f4f6;
            
            /* حركات فيزيائية ناعمة */
            --ease-smooth: cubic-bezier(0.23, 1, 0.32, 1);
        }

        /* ضبط الحجم الأساسي ليعتمد على الـ rem للتكبير */
        html { font-size: 16px; transition: font-size 0.3s ease-out; }

        * { box-sizing: border-box; outline: none; }
        
        body {
            font-family: 'Cairo', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-primary);
            height: 100vh;
            overflow: hidden;
            display: flex;
        }

        /* --- خلفية حية --- */
        .background-gradient {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: 
                radial-gradient(circle at 10% 20%, rgba(56, 189, 248, 0.05) 0%, transparent 60%),
                radial-gradient(circle at 90% 80%, rgba(139, 92, 246, 0.05) 0%, transparent 60%);
            z-index: -1;
            pointer-events: none;
        }

        /* --- القائمة الجانبية (مرنة) --- */
        .sidebar {
            width: 20rem; /* استخدام rem ليتجاوب مع التكبير */
            min-width: 15rem;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: rgba(20, 22, 28, 0.6);
            backdrop-filter: blur(40px);
            border-left: 1px solid var(--glass-border);
            z-index: 40;
            transition: width 0.3s var(--ease-smooth);
            flex-shrink: 0; /* منع الانكماش */
        }

        /* --- الأزرار --- */
        .btn-glass {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.05);
            transition: all 0.3s var(--ease-smooth);
        }
        .btn-glass:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
        }

        /* --- زر البث المباشر (نابض) --- */
        .btn-live {
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.3);
            color: #4ade80;
            transition: all 0.3s;
        }
        .live-active {
            background: rgba(34, 197, 94, 0.2);
            box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
            animation: pulse-green 2s infinite;
        }
        @keyframes pulse-green {
            0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
            100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }

        /* --- فقاعات المحادثة --- */
        .msg-bubble {
            padding: 1.2rem 1.5rem;
            border-radius: 1.5rem;
            margin-bottom: 1.5rem;
            line-height: 1.6;
            font-size: 1.1rem;
            font-weight: 500;
            position: relative;
            max-width: 85%;
            animation: slideUp 0.5s var(--ease-smooth);
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .msg-user {
            background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2));
            border: 1px solid rgba(6, 182, 212, 0.3);
            border-radius: 1.5rem 1.5rem 0.3rem 1.5rem;
            margin-right: auto;
            color: #fff;
        }

        .msg-ai {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 1.5rem 1.5rem 1.5rem 0.3rem;
            margin-left: auto;
            color: #e5e7eb;
        }

        /* --- منطقة الإدخال --- */
        .input-floating-zone {
            position: absolute;
            bottom: 0; left: 0; width: 100%;
            padding: 1.5rem;
            background: linear-gradient(to top, var(--bg-color) 40%, transparent 100%);
            z-index: 50;
            pointer-events: none; /* يسمح بالنقر من خلال المناطق الفارغة */
        }

        .input-container {
            max-width: 60rem;
            margin: 0 auto;
            pointer-events: auto;
            display: flex; flex-direction: column; gap: 0.8rem;
        }

        .input-wrapper {
            background: rgba(30, 32, 38, 0.85);
            backdrop-filter: blur(30px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 1.8rem;
            padding: 0.6rem;
            transition: all 0.3s var(--ease-smooth);
            box-shadow: 0 15px 40px -10px rgba(0,0,0,0.6);
        }
        .input-wrapper:focus-within {
            border-color: rgba(0, 242, 255, 0.4);
            transform: translateY(-2px);
        }

        /* --- شريط التكبير المطور --- */
        .zoom-control {
            background: rgba(0,0,0,0.3);
            padding: 1rem;
            border-radius: 1rem;
            border: 1px solid rgba(255,255,255,0.05);
        }
        input[type=range] {
            -webkit-appearance: none; width: 100%; background: transparent; margin-top: 0.5rem;
        }
        input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none; height: 14px; width: 14px;
            border-radius: 50%; background: var(--neon-cyan);
            cursor: pointer; margin-top: -5px;
            box-shadow: 0 0 10px var(--neon-cyan);
        }
        input[type=range]::-webkit-slider-runnable-track {
            width: 100%; height: 4px; cursor: pointer;
            background: rgba(255,255,255,0.1); border-radius: 2px;
        }

        /* --- Scrollbar --- */
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
        
        /* --- مؤشر التحليل المباشر --- */
        #live-indicator {
            position: fixed; top: 1rem; left: 50%; transform: translateX(-50%);
            background: rgba(34, 197, 94, 0.9); color: black;
            padding: 0.5rem 1.5rem; border-radius: 2rem;
            font-weight: bold; font-size: 0.9rem;
            z-index: 100; box-shadow: 0 0 20px rgba(34, 197, 94, 0.4);
            display: none; align-items: center; gap: 0.5rem;
            animation: slideDown 0.5s ease-out;
        }
        @keyframes slideDown { from { top: -50px; } to { top: 1rem; } }

        /* --- Modal --- */
        #macro-modal { background: rgba(15, 17, 22, 0.95); backdrop-filter: blur(20px); z-index: 100; }
    </style>
</head>
<body class="text-right">

    <div class="background-gradient"></div>

    <!-- مؤشر البث المباشر -->
    <div id="live-indicator">
        <div class="w-2 h-2 bg-black rounded-full animate-pulse"></div>
        جارٍ تحليل الشاشة لحظياً...
    </div>

    <!-- القائمة الجانبية -->
    <aside class="sidebar hidden md:flex p-5 gap-5 border-l border-white/5">
        <div class="flex items-center gap-3 px-1 mb-2">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                <i class="fas fa-cube text-white"></i>
            </div>
            <span class="font-black text-2xl tracking-wide text-white">Ultron <span class="font-light text-cyan-400">OS</span></span>
        </div>

        <button onclick="startNewChat()" class="w-full py-3 rounded-xl btn-glass flex items-center justify-center gap-2 text-white font-bold text-lg hover:bg-white/5">
            <i class="fas fa-plus text-cyan-400"></i> محادثة جديدة
        </button>

        <!-- زر التحليل المباشر -->
        <button id="btn-live-toggle" onclick="toggleLiveAnalysis()" class="w-full py-3 rounded-xl btn-live flex items-center justify-center gap-2 font-bold text-lg">
            <i class="fas fa-broadcast-tower"></i> تحليل مباشر (Live)
        </button>

        <!-- التحكم بالتكبير -->
        <div class="zoom-control">
            <div class="flex justify-between items-center text-xs text-gray-400 font-bold mb-1">
                <span><i class="fas fa-search-plus ml-1"></i> حجم الواجهة</span>
                <span id="zoom-text">100%</span>
            </div>
            <input type="range" min="12" max="24" value="16" step="1" oninput="changeZoom(this.value)">
        </div>

        <!-- السجل -->
        <div class="flex-1 overflow-y-auto space-y-2 pr-1 custom-scroll">
            <div class="text-xs text-gray-500 font-bold uppercase tracking-wider mt-2 px-1">سجل المحادثات</div>
            <div id="history-container"></div>
        </div>
        
        <!-- إعدادات الموديل -->
        <div class="mt-auto pt-4 border-t border-white/5">
            <div class="bg-black/20 p-1 rounded-xl border border-white/5 mb-2 transition-colors">
                <input type="text" id="model-id" value="qwen/qwen2.5-vl-7b:2" 
                    class="w-full bg-transparent p-2 text-center text-xs font-mono text-cyan-300 placeholder-gray-600 focus:text-white transition-colors"
                    placeholder="Model ID...">
            </div>
        </div>
    </aside>

    <!-- منطقة الشات -->
    <main class="flex-1 flex flex-col relative h-full">
        
        <!-- هيدر الموبايل -->
        <header class="md:hidden p-4 flex justify-between items-center bg-black/40 backdrop-blur-md z-30 border-b border-white/5">
            <span class="font-bold text-lg text-cyan-400">Ultron OS</span>
            <button class="text-white/70"><i class="fas fa-bars"></i></button>
        </header>

        <!-- حاوية الرسائل (تم زيادة المسافة السفلية لمنع الاختفاء pb-80) -->
        <div id="chat-container" class="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth pb-80 custom-scroll">
            <div class="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-0 animate-[fadeIn_1s_ease-out_forwards]" id="welcome-screen">
                <div class="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-[#1a1c23] to-[#0f1115] border border-white/10 flex items-center justify-center shadow-2xl">
                    <i class="fas fa-brain text-6xl text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-blue-600 animate-pulse"></i>
                </div>
                <div>
                    <h1 class="text-4xl font-black mb-2 text-white">نظام <span class="text-cyan-400">أولترون</span></h1>
                    <p class="text-gray-400 text-lg">شارك شاشتك بالضغط على "تحليل مباشر" ودعني أساعدك.</p>
                </div>
            </div>
        </div>

        <!-- منطقة الإدخال -->
        <div class="input-floating-zone">
            <div class="input-container">
                
                <!-- شريط الأزرار -->
                <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" id="macros-container"></div>

                <!-- معاينة الصورة -->
                <div id="image-preview" class="hidden mb-2 mx-2 relative w-fit">
                    <img id="preview-img" src="" class="h-24 rounded-xl border border-cyan-500/30 shadow-lg">
                    <button onclick="clearImage()" class="absolute -top-3 -left-3 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md"><i class="fas fa-times text-xs"></i></button>
                </div>

                <!-- مربع الكتابة -->
                <div class="input-wrapper flex items-end gap-3 relative z-50">
                    <button onclick="document.getElementById('file-upload').click()" class="w-10 h-10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 flex items-center justify-center flex-shrink-0" title="صورة">
                        <i class="fas fa-image text-lg"></i>
                    </button>
                    <input type="file" id="file-upload" class="hidden" accept="image/*" onchange="handleFileUpload(this)">

                    <textarea id="user-input" rows="1" placeholder="أدخل رسالتك..." 
                        class="w-full bg-transparent text-white py-2 px-2 max-h-[200px] outline-none resize-none font-semibold text-lg leading-relaxed dir-auto placeholder-gray-600"
                        oninput="this.style.height = ''; this.style.height = Math.min(this.scrollHeight, 200) + 'px'"></textarea>

                    <button id="mic-btn" onclick="toggleVoice()" class="w-10 h-10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 flex items-center justify-center flex-shrink-0" title="تحدث">
                        <i class="fas fa-microphone text-lg"></i>
                    </button>

                    <button onclick="sendMessage()" class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-lg hover:scale-105 transition-transform">
                        <i class="fas fa-paper-plane text-lg"></i>
                    </button>
                </div>
            </div>
        </div>

    </main>

    <!-- نافذة إضافة زر -->
    <div id="macro-modal" class="fixed inset-0 hidden flex items-center justify-center bg-black/80 backdrop-blur-md">
        <div class="bg-[#15171e] border border-gray-700/50 rounded-3xl p-8 w-full max-w-lg shadow-2xl relative">
            <button onclick="closeMacroModal()" class="absolute top-6 left-6 text-gray-400 hover:text-white"><i class="fas fa-times text-xl"></i></button>
            <h2 class="text-2xl font-black text-cyan-400 mb-6 flex items-center gap-3"><i class="fas fa-robot"></i> زر جديد</h2>
            <div class="space-y-4">
                <input type="text" id="macro-name" placeholder="اسم الزر..." class="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500">
                
                <!-- زر التوليد السحري (تم نقله هنا كما طلبت) -->
                <button onclick="autoGeneratePrompt()" class="w-full py-2 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 rounded-xl text-cyan-400 text-sm font-bold hover:bg-cyan-500/10 transition-all flex items-center justify-center gap-2">
                    <i class="fas fa-magic"></i> توليد البرومت تلقائياً
                </button>

                <textarea id="macro-prompt" rows="3" placeholder="الأمر المخفي..." class="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500"></textarea>
                
                <button onclick="saveMacro()" class="w-full py-3 bg-cyan-600 text-white rounded-xl font-bold hover:bg-cyan-500 shadow-lg">حفظ وإضافة</button>
            </div>
        </div>
    </div>

    <!-- عنصر فيديو مخفي للبث المباشر -->
    <video id="screen-video" autoplay style="display:none;"></video>
    <canvas id="screen-canvas" style="display:none;"></canvas>

    <script>
        const API_URL = "http://127.0.0.1:1234/v1/chat/completions";
        let currentImage = null;
        let isLiveAnalysis = false;
        let liveInterval = null;
        let isProcessing = false;

        // --- التحكم بالتكبير (Zoom) ---
        function changeZoom(val) {
            // نغير حجم الخط الأساسي للجذر (Root Font Size)
            // القيمة الافتراضية 16px. هذا سيقوم بتكبير كل شيء يعتمد على rem
            document.documentElement.style.fontSize = val + 'px';
            
            // حساب النسبة المئوية للعرض
            const percent = Math.round((val / 16) * 100);
            document.getElementById('zoom-text').innerText = percent + '%';
        }

        // --- نظام البث المباشر (Live) ---
        async function toggleLiveAnalysis() {
            if (isLiveAnalysis) {
                stopLiveAnalysis();
            } else {
                try {
                    const stream = await navigator.mediaDevices.getDisplayMedia({ 
                        video: { cursor: "always" }, 
                        audio: false 
                    });
                    
                    const video = document.getElementById('screen-video');
                    video.srcObject = stream;
                    
                    // عند إيقاف المشاركة من شريط المتصفح
                    stream.getTracks()[0].onended = stopLiveAnalysis;

                    isLiveAnalysis = true;
                    document.getElementById('btn-live-toggle').classList.add('live-active');
                    document.getElementById('btn-live-toggle').innerHTML = '<i class="fas fa-stop-circle"></i> إيقاف التحليل';
                    document.getElementById('live-indicator').style.display = 'flex';
                    
                    addMessageToUI('ai', '🚀 **تم تفعيل التحليل المباشر.**\nسأراقب شاشتك الآن وأخبرك بما أراه أو أساعدك في أي خطوة. فقط اعمل بشكل طبيعي.');

                    // بدء حلقة التحليل (كل 5 ثواني)
                    liveInterval = setInterval(captureAndAnalyze, 5000);

                } catch (err) {
                    console.error(err);
                    alert("لم يتم اختيار شاشة أو تم رفض الإذن.");
                }
            }
        }

        function stopLiveAnalysis() {
            isLiveAnalysis = false;
            clearInterval(liveInterval);
            
            const video = document.getElementById('screen-video');
            if (video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
                video.srcObject = null;
            }

            document.getElementById('btn-live-toggle').classList.remove('live-active');
            document.getElementById('btn-live-toggle').innerHTML = '<i class="fas fa-broadcast-tower"></i> تحليل مباشر (Live)';
            document.getElementById('live-indicator').style.display = 'none';
            addMessageToUI('ai', '🛑 **تم إيقاف التحليل المباشر.**');
        }

        async function captureAndAnalyze() {
            if (isProcessing) return; // منع التداخل اذا كان الطلب السابق لم ينته
            isProcessing = true;

            const video = document.getElementById('screen-video');
            const canvas = document.getElementById('screen-canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // ضغط الصورة لتقليل الحمل
            const base64Image = canvas.toDataURL('image/jpeg', 0.6); 
            const modelId = document.getElementById('model-id').value.trim();

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: modelId,
                        messages: [
                            { role: "system", content: "أنت مساعد ذكي يراقب شاشة المستخدم في بث مباشر. صف ما يحدث باختصار شديد أو قدم نصيحة مفيدة إذا رأيت خطأ أو كود. كن موجزاً جداً (سطر أو سطرين)." },
                            { role: "user", content: [{ type: "text", text: "ماذا يحدث على الشاشة الآن؟" }, { type: "image_url", image_url: { url: base64Image } }] }
                        ],
                        temperature: 0.5,
                        max_tokens: 100 
                    })
                });

                const data = await response.json();
                if (data.choices && data.choices.length > 0) {
                    const reply = data.choices[0].message.content;
                    addMessageToUI('ai', `👁️ **تحليل:** ${reply}`);
                }
            } catch (error) {
                console.error("Live Analysis Error", error);
            } finally {
                isProcessing = false;
            }
        }

        // --- باقي الوظائف (Macros, Chat, etc) ---
        // (تم دمجها وضبطها لتعمل مع النظام الجديد)
        
        let macros = JSON.parse(localStorage.getItem('ultron_macros')) || [
            { id: 1, name: 'ترجمة', prompt: 'ترجم هذا للعربية', active: false },
            { id: 2, name: 'شرح', prompt: 'اشرح هذا ببساطة', active: false }
        ];

        function renderMacros() {
            const container = document.getElementById('macros-container');
            container.innerHTML = '';
            
            const addBtn = document.createElement('button');
            addBtn.onclick = openMacroModal;
            addBtn.className = 'bg-white/5 border border-white/10 text-cyan-400 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap hover:bg-white/10 transition-all flex items-center gap-2';
            addBtn.innerHTML = '<i class="fas fa-plus"></i> زر جديد';
            container.appendChild(addBtn);

            macros.forEach(macro => {
                const btn = document.createElement('button');
                btn.className = `px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${macro.active ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(0,242,255,0.2)]' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`;
                btn.innerHTML = `${macro.name} <i class="fas fa-times ml-2 opacity-50 hover:text-red-400" onclick="deleteMacro(${macro.id}, event)"></i>`;
                btn.onclick = () => toggleMacro(macro.id);
                container.appendChild(btn);
            });
        }

        function toggleMacro(id) { const m = macros.find(x => x.id === id); if(m){ m.active = !m.active; renderMacros(); } }
        function deleteMacro(id, e) { e.stopPropagation(); if(confirm('حذف؟')) { macros = macros.filter(x => x.id !== id); localStorage.setItem('ultron_macros', JSON.stringify(macros)); renderMacros(); } }
        function saveMacro() {
            const name = document.getElementById('macro-name').value;
            const prompt = document.getElementById('macro-prompt').value;
            if(name && prompt) {
                macros.push({id: Date.now(), name, prompt, active: false});
                localStorage.setItem('ultron_macros', JSON.stringify(macros));
                renderMacros();
                closeMacroModal();
            }
        }
        function openMacroModal() { document.getElementById('macro-modal').classList.remove('hidden'); }
        function closeMacroModal() { document.getElementById('macro-modal').classList.add('hidden'); }
        function autoGeneratePrompt() {
            const name = document.getElementById('macro-name').value;
            const f = document.getElementById('macro-prompt');
            if(name.includes('ترجم')) f.value = "ترجم النص التالي بدقة.";
            else f.value = `تعامل كخبير في ${name}.`;
        }

        // --- Chat Core ---
        async function sendMessage() {
            const input = document.getElementById('user-input');
            const text = input.value.trim();
            const modelId = document.getElementById('model-id').value.trim();
            
            if (!text && !currentImage) return;

            document.getElementById('welcome-screen')?.remove();
            addMessageToUI('user', text, currentImage);
            
            input.value = ''; input.style.height = 'auto';
            const imgToSend = currentImage;
            clearImage();
            
            const loadingId = addLoading();

            const activeMacros = macros.filter(m => m.active);
            let sysPrompt = "أنت مساعد ذكي.";
            if(activeMacros.length) sysPrompt += "\nتعليمات: " + activeMacros.map(m => m.prompt).join('\n');

            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        model: modelId,
                        messages: [{role: "system", content: sysPrompt}, {role: "user", content: [{type:"text", text: text || "صورة"}, ...(imgToSend ? [{type:"image_url", image_url: {url: imgToSend}}] : [])]}],
                        temperature: 0.7
                    })
                });
                const data = await res.json();
                document.getElementById(loadingId).remove();
                if(data.error) addMessageToUI('ai', "خطأ: " + data.error.message);
                else addMessageToUI('ai', data.choices[0].message.content);
            } catch(e) {
                document.getElementById(loadingId).remove();
                addMessageToUI('ai', "فشل الاتصال بـ LM Studio.");
            }
        }

        function addMessageToUI(role, text, img = null) {
            const container = document.getElementById('chat-container');
            const div = document.createElement('div');
            div.className = `msg-bubble ${role === 'user' ? 'msg-user' : 'msg-ai'}`;
            let content = '';
            if(img) content += `<img src="${img}" class="max-w-xs rounded-xl mb-2 shadow-lg">`;
            content += `<div class="whitespace-pre-wrap">${text}</div>`;
            div.innerHTML = content;
            container.appendChild(div);
            // استخدم timeout بسيط لضمان تحديث الواجهة قبل السكرول
            setTimeout(() => {
                container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            }, 50);
            
            // Save history logic here if needed
        }

        function addLoading() {
            const id = 'loading-' + Date.now();
            const div = document.createElement('div');
            div.id = id;
            div.className = 'msg-bubble msg-ai flex items-center gap-2';
            div.innerHTML = `<div class="typing-indicator flex gap-1"><div class="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div><div class="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-75"></div><div class="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-150"></div></div>`;
            document.getElementById('chat-container').appendChild(div);
            setTimeout(() => {
                document.getElementById('chat-container').scrollTo({ top: document.getElementById('chat-container').scrollHeight, behavior: 'smooth' });
            }, 50);
            return id;
        }

        // --- Helpers ---
        function handleFileUpload(input) {
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => { currentImage = e.target.result; document.getElementById('preview-img').src = currentImage; document.getElementById('image-preview').classList.remove('hidden'); };
            reader.readAsDataURL(file);
        }
        function clearImage() { currentImage = null; document.getElementById('image-preview').classList.add('hidden'); }
        
        // سجل المحادثات البسيط
        function startNewChat() {
            document.getElementById('chat-container').innerHTML = '';
            // Restore welcome screen
            const welcome = document.createElement('div');
            welcome.id = 'welcome-screen';
            welcome.className = 'flex flex-col items-center justify-center h-full text-center space-y-6 opacity-0 animate-[fadeIn_1s_ease-out_forwards]';
            welcome.innerHTML = `<div class="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-[#1a1c23] to-[#0f1115] border border-white/10 flex items-center justify-center shadow-2xl"><i class="fas fa-brain text-6xl text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-blue-600 animate-pulse"></i></div><div><h1 class="text-4xl font-black mb-2 text-white">نظام <span class="text-cyan-400">أولترون</span></h1><p class="text-gray-400 text-lg">شارك شاشتك بالضغط على "تحليل مباشر" ودعني أساعدك.</p></div>`;
            document.getElementById('chat-container').appendChild(welcome);
        }

        // Initialize
        renderMacros();
        document.getElementById('user-input').addEventListener('keypress', (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
        
        // Paste image
        document.addEventListener('paste', (e) => {
            const items = e.clipboardData.items;
            for (let item of items) {
                if (item.type.indexOf("image") !== -1) {
                    const blob = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = (event) => { currentImage = event.target.result; document.getElementById('preview-img').src = currentImage; document.getElementById('image-preview').classList.remove('hidden'); };
                    reader.readAsDataURL(blob);
                }
            }
        });
    </script>
</body>
</html>