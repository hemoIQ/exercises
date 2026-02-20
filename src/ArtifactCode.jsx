<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart PDF Reader - Focus Edition</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf_viewer.min.css">
    
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700&display=swap');

        :root {
            --glass-bg: rgba(15, 23, 42, 0.95);
            --glass-border: rgba(255, 255, 255, 0.1);
            --accent-blue: #3b82f6;
            --page-width: 850px; /* العرض الافتراضي */
            --sidebar-width: 400px;
            --chat-font-size: 16px; /* حجم خط الشات الافتراضي */
        }

        body {
            font-family: 'Cairo', sans-serif;
            background: radial-gradient(circle at 50% -20%, #0f172a, #020617 80%);
            color: #f1f5f9;
            margin: 0; padding: 0;
            overflow: hidden;
            height: 100vh;
        }

        /* إخفاء شريط التمرير */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* --- الهيكل العام (الشاشة المقسمة) --- */
        #app-container {
            display: flex; width: 100%; height: 100%; overflow: hidden;
            flex-direction: row; 
        }

        /* الشريط الجانبي AI (يظهر من اليمين بسبب RTL) */
        #ai-sidebar {
            width: var(--sidebar-width);
            min-width: 0; max-width: 60vw;
            background: var(--glass-bg);
            border-left: 1px solid var(--glass-border);
            display: flex; flex-direction: column;
            z-index: 50; transition: width 0.3s ease;
            position: relative; flex-shrink: 0;
            overflow: hidden;
        }
        #ai-sidebar.collapsed { width: 0; border: none; }

        /* المقبض */
        #resizer {
            width: 5px; cursor: col-resize; background: transparent; z-index: 60;
            transition: background 0.2s; flex-shrink: 0;
        }
        #resizer:hover, .resizing { background: var(--accent-blue) !important; }

        /* منطقة المحتوى الأساسي */
        #main-content {
            flex: 1; position: relative; display: flex; flex-direction: column;
            min-width: 0; transition: width 0.1s; background: transparent;
        }

        /* --- الحاويات الداخلية --- */
        #section-library {
            position: absolute; inset: 0; z-index: 10;
            display: flex; flex-direction: column;
            background: inherit;
        }
        
        #section-reader {
            position: absolute; inset: 0; z-index: 20;
            background: #0f172a;
            display: none; flex-direction: column;
        }

        /* --- الهيدر (الشريط العلوي) --- */
        .library-header {
            height: 90px; padding: 0 3rem;
            display: flex; align-items: center; justify-content: space-between;
            background: rgba(2, 6, 23, 0.8); backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--glass-border);
        }

        /* هيدر القارئ (عائم ومختفي) */
        #reader-header {
            position: absolute; top: 0; left: 0; right: 0; height: 80px; 
            background: var(--glass-bg); backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--glass-border);
            display: flex; align-items: center; padding: 0 2rem;
            z-index: 5000; transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            transform: translateY(-100%);
        }
        #reader-header.show { transform: translateY(0); }

        /* --- منطقة الصفحات --- */
        #reader-scroll {
            flex: 1; overflow-y: auto; overflow-x: hidden;
            scroll-behavior: auto !important; height: 100%;
        }

        #pages-container {
            display: flex; flex-direction: column; gap: 40px; align-items: center;
            padding: 100px 0 400px 0; width: 100%;
        }

        .page-holder {
            position: relative; background: white;
            box-shadow: 0 50px 100px -20px rgba(0,0,0,0.8);
            width: var(--page-width); max-width: 98%; margin: 0 auto;
            display: block; flex-shrink: 0; border-radius: 8px;
            transition: width 0.3s ease; direction: ltr; 
        }

        /* وضع العرض المرن */
        body.flexible-mode .page-holder { width: 98% !important; max-width: 98% !important; }

        /* --- الطبقات --- */
        .pdf-canvas { width: 100%; height: 100%; display: block; position: absolute; top: 0; left: 0; z-index: 1; border-radius: 8px;}
        
        .textLayer {
            position: absolute; left: 0; top: 0; right: 0; bottom: 0;
            overflow: hidden; opacity: 1; line-height: 1.0; 
            z-index: 5; mix-blend-mode: multiply; pointer-events: auto;
        }
        .textLayer span { color: transparent; position: absolute; white-space: pre; cursor: text; transform-origin: 0% 0%; }
        .textLayer ::selection { background: rgba(59, 130, 246, 0.3); color: transparent; }

        .draw-layer {
            position: absolute; inset: 0; z-index: 10;
            pointer-events: none; touch-action: none; mix-blend-mode: multiply; border-radius: 8px;
        }
        .draw-layer.active-drawing { pointer-events: auto; z-index: 20; }

        /* --- الوضع الليلي --- */
        .inverted-mode .page-holder { background: #000; border: 1px solid #333; }
        .inverted-mode .pdf-canvas { filter: invert(1) hue-rotate(180deg) contrast(0.9); }
        .inverted-mode .textLayer { filter: invert(1); }
        .inverted-mode .draw-layer { mix-blend-mode: screen; }

        /* --- الأزرار الأساسية --- */
        .glass-btn {
            background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border);
            border-radius: 12px; cursor: pointer; transition: all 0.3s;
            display: flex; align-items: center; justify-content: center; min-width: 40px; height: 40px; color: white;
        }
        .glass-btn:hover { background: rgba(255,255,255,0.15); border-color: var(--accent-blue); transform: translateY(-2px); }
        .glass-btn.active { background: var(--accent-blue); color: white; border-color: transparent; box-shadow: 0 0 15px rgba(59, 130, 246, 0.4); }

        .sub-tools {
            max-width: 0; overflow: hidden; opacity: 0; transition: all 0.4s ease;
            display: flex; align-items: center; gap: 8px; margin-right: 10px;
        }
        .sub-tools.visible { max-width: 800px; opacity: 1; }

        /* منطقة السحب */
        #drop-overlay {
            display: none; position: fixed; inset: 0; z-index: 10000;
            justify-content: center; align-items: center; backdrop-filter: blur(30px);
            background: rgba(2,6,23,0.95);
        }
        #drop-overlay.active { display: flex; }
        .drop-box { border: 4px dashed var(--accent-blue); padding: 80px; border-radius: 50px; text-align: center; }

        .color-dot { width: 20px; height: 20px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; }
        .color-dot.active { border-color: white; transform: scale(1.2); }
        .pomo-font { font-family: 'JetBrains Mono', monospace; }
        .brace-toggle-btn { font-size: 10px; font-weight: bold; padding: 4px 8px; border-radius: 6px; background: rgba(255,255,255,0.1); transition: 0.3s; color: white; border: none; cursor: pointer;}
        .brace-toggle-btn.active { background: var(--accent-blue); color: white; }

        #brush-cursor { position: fixed; pointer-events: none; z-index: 9999; display: none; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 15px rgba(255,255,255,0.5); }
        .crop-active { cursor: crosshair !important; }
        #selection-rect { position: fixed; border: 2px solid var(--accent-blue); background: rgba(59,130,246,0.2); display: none; z-index: 6000; pointer-events: none; border-radius: 4px; }
        
        #loading { display: none; position: fixed; inset: 0; z-index: 9999; justify-content: center; align-items: center; background: rgba(0,0,0,0.9); }
        .book-card { background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 20px; overflow: hidden; transition: transform 0.3s; cursor: pointer; }
        .book-card:hover { transform: translateY(-5px); border-color: var(--accent-blue); }

        /* --- الذكاء الاصطناعي (شات) --- */
        .chat-header { padding: 15px 20px; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); }
        .chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 20px; }
        
        /* خط المحادثة يتغير حسب المتغير */
        .msg-bubble {
            padding: 16px 20px; border-radius: 16px; max-width: 95%;
            font-size: var(--chat-font-size); line-height: 1.7; word-wrap: break-word; font-weight: 500;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: font-size 0.2s ease;
        }
        .msg-user { align-self: flex-start; background: #2563eb; color: white; border-bottom-right-radius: 4px; }
        .msg-ai { align-self: flex-end; background: rgba(255, 255, 255, 0.08); border: 1px solid var(--glass-border); color: #f1f5f9; border-bottom-left-radius: 4px; }

        .input-area { padding: 20px; border-top: 1px solid var(--glass-border); background: rgba(0,0,0,0.4); }
        .chat-input {
            width: 100%; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border);
            border-radius: 12px; padding: 14px 16px; color: white; outline: none; 
            font-size: calc(var(--chat-font-size) - 2px); 
            min-height: 55px; max-height: 150px; resize: none; direction: rtl;
            transition: font-size 0.2s ease;
        }
        .chat-input:focus { border-color: var(--accent-blue); background: rgba(255,255,255,0.08); }

        .macros-container { display: flex; gap: 8px; overflow-x: auto; padding: 10px 20px; border-bottom: 1px solid var(--glass-border); scrollbar-width: none; background: rgba(0,0,0,0.2); }
        .macro-btn {
            padding: 8px 14px; border-radius: 10px; font-size: 13px; font-weight: bold; white-space: nowrap;
            background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); color: #9ca3af;
            cursor: pointer; transition: 0.2s;
        }
        .macro-btn:hover { background: rgba(255,255,255,0.1); color: white; }
        .macro-btn.active { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border-color: #3b82f6; }
        
        #img-preview-container { display: none; position: relative; width: fit-content; margin-bottom: 10px; }
        #img-preview { height: 90px; border-radius: 8px; border: 1px solid var(--accent-blue); }
        .close-img { position: absolute; top: -8px; right: -8px; background: red; width: 22px; height: 22px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 12px; cursor: pointer; color: white; font-weight: bold; }

        /* تم نقل زر فتح الشات ليكون في اليمين بشكل صحيح */
        #toggle-sidebar-btn {
            position: fixed; right: 0; left: auto; top: 50%; transform: translateY(-50%);
            background: var(--glass-bg); border: 1px solid var(--glass-border); border-right: none;
            padding: 15px 5px; border-radius: 12px 0 0 12px; cursor: pointer; z-index: 4000;
            display: none; box-shadow: -5px 0 20px rgba(0,0,0,0.5); font-size: 20px; color: var(--accent-blue);
        }

        #modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); z-index: 9000; display: none; justify-content: center; align-items: center; }
        .modal-box { background: #0f172a; border: 1px solid var(--glass-border); padding: 25px; border-radius: 20px; width: 350px; }
        .modal-input { width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); padding: 10px; border-radius: 10px; color: white; margin-bottom: 10px; outline: none; }
        .modal-input:focus { border-color: var(--accent-blue); }

        .recording { color: #ef4444; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
    </style>
</head>
<body class="natural-view mode-read">

    <div id="brush-cursor"></div>
    <div id="selection-rect"></div>
    <div id="drop-overlay"><div class="drop-box"><h2 class="text-6xl font-black mb-4 text-white">أفلت كتابك هنا</h2><p class="text-xl text-gray-400">سيتم تفعيل المصحح اللغوي والميزات الذكية</p></div></div>
    <div id="loading"><div class="text-center"><div class="w-20 h-20 border-4 border-t-blue-500 rounded-full animate-spin mb-6 mx-auto"></div><p class="text-blue-400 font-bold tracking-widest">LOADING SYSTEM</p></div></div>
    <div id="toast" class="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 border border-white/10 px-8 py-4 rounded-full shadow-2xl hidden z-[9000] font-bold text-white"></div>

    <!-- نافذة إضافة أمر ذكي -->
    <div id="modal-overlay">
        <div class="modal-box">
            <h3 class="text-white font-bold mb-4">إضافة زر أمر جديد</h3>
            <input type="text" id="new-btn-name" class="modal-input" placeholder="الاسم (مثلاً: تدقيق)">
            <textarea id="new-btn-prompt" class="modal-input h-24" placeholder="الأمر (مثلاً: دقق هذا النص لغوياً...)"></textarea>
            <div class="flex gap-3 mt-2">
                <button onclick="saveCustomBtn()" class="flex-1 bg-blue-600 text-white py-2 rounded-xl font-bold hover:bg-blue-500">حفظ</button>
                <button onclick="document.getElementById('modal-overlay').style.display='none'" class="flex-1 bg-white/10 text-white py-2 rounded-xl hover:bg-white/20">إلغاء</button>
            </div>
        </div>
    </div>

    <!-- زر إظهار الذكاء الاصطناعي (مخفي في اليمين) -->
    <button id="toggle-sidebar-btn" onclick="toggleSidebar()" title="إظهار الذكاء الاصطناعي">🤖</button>

    <!-- الهيكل العام المقسم -->
    <div id="app-container">
        
        <!-- الشريط الجانبي (الذكاء الاصطناعي) يظهر على اليمين تلقائيا بسبب dir=rtl -->
        <aside id="ai-sidebar" class="sidebar">
            <div class="chat-header">
                <div class="flex items-center gap-3">
                    <span class="text-2xl">🤖</span>
                    <div>
                        <h2 class="font-bold text-white text-lg leading-none">مساعد القراءة</h2>
                        <span class="text-[11px] text-green-400 font-mono">LM Studio Local AI</span>
                    </div>
                </div>
                <button onclick="toggleSidebar()" class="text-gray-400 hover:text-white bg-white/5 px-3 py-1 rounded-lg">✕</button>
            </div>

            <!-- إعدادات الموديل (Model ID Input) -->
            <div class="px-4 py-3 border-b border-white/5 bg-black/20 flex flex-col gap-1.5">
                <label for="model-id-input" class="text-xs text-gray-400 font-bold"><i class="fas fa-microchip ml-1 text-blue-400"></i> معرف الموديل (Model ID)</label>
                <!-- اسم الموديل الافتراضي هو qwen/qwen2.5-vl-7b -->
                <input type="text" id="model-id-input" value="qwen/qwen2.5-vl-7b" class="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-green-400 font-mono text-sm outline-none focus:border-blue-500 transition-colors" dir="ltr" placeholder="أدخل اسم الموديل هنا...">
            </div>

            <!-- أزرار الأوامر السريعة -->
            <div class="macros-container" id="macros-list">
                <button class="macro-btn text-green-400 bg-green-400/10 border-green-400/30 add-macro-btn" onclick="openModal()">+ إضافة</button>
            </div>

            <!-- التحكم بتكبير خط الشات -->
            <div class="px-4 py-2 border-b border-white/5 bg-black/20 flex justify-between items-center text-xs text-gray-400">
                <span><i class="fas fa-font ml-1 text-blue-400"></i> حجم خط المحادثة</span>
                <input type="range" min="12" max="32" value="16" step="1" oninput="changeChatZoom(this.value)" class="w-24 h-1 accent-blue-500 cursor-pointer">
            </div>

            <!-- الشات -->
            <div class="chat-messages no-scrollbar" id="chat-box">
                <div class="msg-bubble msg-ai">
                    أهلاً بك! يمكنك تفعيل الأزرار بالأعلى وسأقوم بتنفيذها على أي نص ترسله. 
                    <br><br>
                    <span class="text-sm text-yellow-400">ملاحظة: تأكد من تشغيل السيرفر في LM Studio وتفعيل خيار CORS من الإعدادات ليتم الاتصال بنجاح.</span>
                </div>
            </div>

            <!-- الإدخال -->
            <div class="input-area">
                <div id="img-preview-container">
                    <img id="img-preview" src="">
                    <div class="close-img" onclick="clearImg()">✕</div>
                </div>
                
                <div class="flex items-end gap-2 relative">
                    <button onclick="toggleVoice()" id="mic-btn" class="glass-btn !w-12 !h-12 text-gray-400 hover:text-white" title="تحدث">🎤</button>
                    <input type="file" id="chat-img-upload" class="hidden" accept="image/*" onchange="handleImgSelect(event)">
                    <button onclick="document.getElementById('chat-img-upload').click()" class="glass-btn !w-12 !h-12 text-gray-400 hover:text-white" title="إرفاق صورة">🖼️</button>
                    
                    <textarea id="chat-input" class="chat-input no-scrollbar" rows="1" placeholder="اكتب أو الصق صورة..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMsg();}"></textarea>
                    
                    <button onclick="sendMsg()" class="glass-btn !w-12 !h-12 bg-blue-600 hover:bg-blue-500 text-white !border-0" title="إرسال">➤</button>
                </div>
            </div>
        </aside>

        <!-- مقبض السحب -->
        <div id="resizer"></div>

        <!-- منطقة المحتوى الرئيسي (يسار) -->
        <div id="main-content">
            
            <!-- ================= القسم الأول: المكتبة ================= -->
            <div id="section-library">
                <header class="library-header">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" stroke-width="2"></path></svg></div>
                        <h1 class="text-3xl font-black text-white">قارئ <span class="text-blue-500">برو</span></h1>
                    </div>
                    
                    <div id="lib-controls">
                        <input type="file" id="file-in" class="hidden" accept=".pdf" onchange="handleIn(event)">
                        <label for="file-in" class="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-2xl font-bold cursor-pointer transition shadow-lg shadow-blue-500/30 flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" stroke-width="3"></path></svg>
                            إضافة كتاب
                        </label>
                    </div>
                </header>

                <div class="flex-1 overflow-y-auto p-12">
                    <div class="max-w-[1600px] mx-auto text-right">
                        <div class="mb-16 pb-8 border-b border-white/5">
                            <h2 class="text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-l from-white to-slate-500">مكتبتي</h2>
                            <div id="books-grid" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10"></div>
                            <div id="empty-state" class="hidden text-center py-20 text-gray-500 text-2xl">المكتبة فارغة.. اسحب ملف هنا</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ================= القسم الثاني: القارئ ================= -->
            <div id="section-reader">
                
                <header id="reader-header" class="hide-up">
                    <div class="flex items-center gap-4">
                        <button onclick="closeReader()" class="bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 px-5 py-2.5 rounded-xl font-bold transition-all text-xs flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                            الرجوع
                        </button>
                        <button onclick="toggleFlex()" id="flex-btn" class="glass-btn w-auto px-4 text-xs font-bold whitespace-nowrap" title="تكبير للصفحة كاملة">عرض مرن</button>
                        <button onclick="toggleInvert()" id="invert-btn" class="glass-btn w-10 h-10 rounded-xl text-yellow-200" title="الوضع الليلي"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" stroke-width="2.5"></path></svg></button>
                    </div>

                    <div class="flex-1 flex justify-center items-center gap-3">
                        
                        <!-- 1. بومودورو مدمج -->
                        <div class="flex items-center bg-white/5 rounded-2xl p-1 border border-white/5">
                            <div class="flex items-center gap-2 px-3 border-l border-white/10 pl-3">
                                <span id="pomo-icon" class="text-lg">🍅</span>
                                <span id="header-pomo-time" class="pomo-font text-blue-400 font-bold">25:00</span>
                            </div>
                            <button onclick="togglePomo()" id="pomo-btn" class="glass-btn w-9 h-9 rounded-lg !border-0 hover:text-green-400"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg></button>
                            <button onclick="resetPomo()" class="glass-btn w-9 h-9 rounded-lg !border-0 hover:text-red-400"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button>
                        </div>

                        <div class="w-px h-8 bg-white/10 mx-1"></div>

                        <!-- سماعة (لقراءة النص المحدد) -->
                        <button onclick="readSelection()" class="glass-btn hover:text-yellow-400 text-lg" title="استماع للنص المحدد">🔊</button>

                        <!-- 2. سكرول -->
                        <div class="flex items-center">
                            <button onclick="toggleSub('scroll')" class="glass-btn" title="تمرير تلقائي"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 13l-7 7-7-7m14-8l-7 7-7-7"></path></svg></button>
                            <div id="scroll-tools" class="sub-tools bg-black/40 rounded-xl p-1 ml-2 border border-white/10">
                                <input type="range" min="1" max="100" value="5" oninput="updateScrollSpeed(this.value)" class="w-20 h-1 accent-blue-500 cursor-pointer mx-2" title="التحكم بسرعة التمرير">
                                <button id="scroll-play-btn" onclick="toggleAutoScroll()" class="glass-btn w-8 h-8 rounded-lg"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg></button>
                            </div>
                        </div>

                        <!-- 3. قلم -->
                        <div class="flex items-center">
                            <button onclick="toggleSub('pen')" class="glass-btn" title="أدوات الرسم"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" stroke-width="2.5" stroke-linecap="round"></path></svg></button>
                            <div id="pen-tools" class="sub-tools bg-black/40 p-1 rounded-xl border border-white/10">
                                <div class="flex gap-2 px-2 border-l border-white/10">
                                    <div onclick="setBrushColor('#ffff00', this)" class="color-dot bg-yellow-400 active"></div>
                                    <div onclick="setBrushColor('#4ade80', this)" class="color-dot bg-green-500"></div>
                                    <div onclick="setBrushColor('#60a5fa', this)" class="color-dot bg-blue-400"></div>
                                </div>
                                <button onclick="setMode('rect')" id="mode-rect" class="glass-btn w-8 h-8 rounded-lg" title="تظليل"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2.5"></rect></svg></button>
                                <button onclick="setMode('free')" id="mode-free" class="glass-btn w-8 h-8 rounded-lg active" title="قلم حر"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" stroke-width="2.5"></path></svg></button>
                                <button onclick="setMode('eraser')" id="mode-eraser" class="glass-btn w-8 h-8 rounded-lg" title="ممحاة"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11l-8-8-7 7 8 8 7-7zM12 19l7 7" stroke-width="2.5"></path></svg></button>
                                <button onclick="handleUndo()" class="glass-btn w-8 h-8 rounded-lg text-red-400" title="تراجع"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" stroke-width="2.5"></path></svg></button>
                                <div class="flex gap-1 border-r border-white/10 pr-1">
                                    <button onclick="setBraceSide('left')" class="brace-toggle-btn">{</button>
                                    <button onclick="setBraceSide('both')" class="brace-toggle-btn active">{ }</button>
                                    <button onclick="setBraceSide('right')" class="brace-toggle-btn">}</button>
                                </div>
                            </div>
                        </div>

                        <!-- 4. تصوير وقص -->
                        <div class="flex items-center">
                            <button onclick="toggleSub('cap')" class="glass-btn" title="قص وتصوير"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke-width="2.5"></path><circle cx="12" cy="13" r="4" stroke-width="2.5"></circle></svg></button>
                            <div id="cap-tools" class="sub-tools bg-black/40 rounded-xl p-1 ml-2 border border-white/10">
                                <button onclick="captureFull()" class="glass-btn w-auto px-3 text-[11px] font-bold whitespace-nowrap">تصوير الصفحة</button>
                                <button onclick="startCrop()" id="btn-crop" class="glass-btn w-auto px-3 text-[11px] font-bold whitespace-nowrap text-blue-400 border-blue-400/30">قص منطقة</button>
                            </div>
                        </div>
                        
                    </div>

                    <!-- يسار الشريط (رقم الصفحة والزوم) -->
                    <div class="flex items-center gap-3">
                        <button onclick="zoomOut()" class="glass-btn !w-8 !h-8 hover:text-cyan-400" title="تصغير"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg></button>
                        <button onclick="zoomIn()" class="glass-btn !w-8 !h-8 hover:text-cyan-400" title="تكبير"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg></button>
                        <div class="h-6 w-px bg-white/10 mx-1"></div>
                        <button onclick="changePage(-1)" class="glass-btn !w-8 !h-8"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></button>
                        <div class="flex items-center bg-black/40 px-3 py-1.5 rounded-xl gap-2 border border-white/10">
                            <input type="number" id="page-inp" value="1" onchange="jump(this.value)" class="bg-transparent w-8 text-center text-white font-bold focus:outline-none text-sm">
                            <span class="text-gray-500 text-xs">/</span>
                            <span id="page-total" class="text-gray-400 text-xs font-bold">0</span>
                        </div>
                        <button onclick="changePage(1)" class="glass-btn !w-8 !h-8"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg></button>
                    </div>
                </header>

                <div id="reader-scroll">
                    <div id="pages-container"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- نافذة تأكيد الحذف -->
    <div id="confirm-modal" class="hidden fixed inset-0 z-[10001] justify-content-center items-center bg-black/80 backdrop-blur-sm p-4">
        <div class="bg-slate-900 border border-white/10 p-8 rounded-3xl text-center max-w-sm w-full shadow-2xl">
            <h3 class="text-2xl font-bold mb-4 text-white">حذف الكتاب؟</h3>
            <div class="flex gap-4">
                <button id="del-yes" class="flex-1 bg-red-600 py-3 rounded-xl font-bold hover:bg-red-500 text-white transition">نعم</button>
                <button onclick="closeModal()" class="flex-1 bg-white/10 py-3 rounded-xl font-bold hover:bg-white/20 text-white transition border border-white/10">لا</button>
            </div>
        </div>
    </div>

    <script>
        const AI_API = "http://127.0.0.1:1234/v1/chat/completions";

        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js';

        let db, pdfDoc, activeId, pageObs;
        let brushColor='#ffff00', brushSize=45, drawMode='free', pageStrokes={}, braceSide='both';
        let isPainting=false, startPos={}, isCrop=false;
        let autoScroll=false, scrollSpeed=5, scrollFrame, scrollFraction=0;
        let pomoT, pomoSec=1500, isPomoRun=false, isBreak=false;
        let isNight = false, isFlexible = false, currentZoom = 850;
        let isResizing = false;
        let activePrompts = new Set();
        let activeImg = null;

        // DB Initialization
        const req = indexedDB.open("SmartReader_FocusAI_v6", 1);
        req.onupgradeneeded = e => { db=e.target.result; if(!db.objectStoreNames.contains('books')) db.createObjectStore('books',{keyPath:'id'}); };
        req.onsuccess = e => { db=e.target.result; renderLib(); initMacros(); };

        // Header Logic Safe
        let headerTimeout;
        window.addEventListener('mousemove', e => {
            const readerSec = document.getElementById('section-reader');
            if(readerSec && window.getComputedStyle(readerSec).display !== 'none') {
                const header = document.getElementById('reader-header');
                const sidebar = document.getElementById('ai-sidebar');
                
                const isOverSidebar = sidebar && sidebar.contains(e.target);
                
                if(e.clientY < 80 || (e.target && e.target.closest && e.target.closest('header')) || isOverSidebar) {
                    if(header) { header.classList.add('show'); clearTimeout(headerTimeout); }
                } else {
                    if(header && !e.target.closest('.sub-tools') && !isCrop) {
                        clearTimeout(headerTimeout);
                        headerTimeout = setTimeout(() => { header.classList.remove('show'); }, 800);
                    }
                }
            }
        });

        // Sidebar Logic
        const sidebar = document.getElementById('ai-sidebar');
        const resizer = document.getElementById('resizer');
        const toggleBtn = document.getElementById('toggle-sidebar-btn');

        function toggleSidebar() {
            sidebar.classList.toggle('collapsed');
            toggleBtn.style.display = sidebar.classList.contains('collapsed') ? 'block' : 'none';
        }

        resizer.addEventListener('mousedown', () => { isResizing = true; document.body.style.cursor = 'col-resize'; resizer.classList.add('resizing'); });
        document.addEventListener('mousemove', e => {
            if (!isResizing) return;
            // حساب العرض ليتناسب مع فتحة اليمين (RTL)
            const w = e.clientX; 
            if(w > 250 && w < window.innerWidth * 0.6) {
                document.documentElement.style.setProperty('--sidebar-width', w + 'px');
            }
        });
        document.addEventListener('mouseup', () => { isResizing = false; document.body.style.cursor = 'default'; resizer.classList.remove('resizing'); });

        // تكبير وتصغير خط الشات
        function changeChatZoom(val) {
            document.documentElement.style.setProperty('--chat-font-size', val + 'px');
        }

        // --- Macros ---
        const defaultMacros = [
            {name: 'ترجمة', prompt: 'ترجم هذا النص إلى العربية بدقة:'},
            {name: 'شرح', prompt: 'اشرح هذا النص بالتفصيل وبأسلوب مبسط:'}
        ];

        function initMacros() {
            const stored = JSON.parse(localStorage.getItem('focus_macros_v2')) || defaultMacros;
            const container = document.getElementById('macros-list');
            Array.from(container.children).forEach(c => { if(!c.classList.contains('add-macro-btn')) c.remove(); });
            
            stored.forEach(m => {
                const btn = document.createElement('button');
                btn.className = 'macro-btn';
                btn.innerText = m.name;
                btn.onclick = function() { togglePrompt(this, m.prompt); };
                container.insertBefore(btn, container.lastElementChild);
            });
        }
        
        function togglePrompt(btn, prompt) {
            if(activePrompts.has(prompt)) { activePrompts.delete(prompt); btn.classList.remove('active'); } 
            else { activePrompts.add(prompt); btn.classList.add('active'); }
        }

        function openModal() { document.getElementById('modal-overlay').style.display='flex'; }
        function saveCustomBtn() {
            const name = document.getElementById('new-btn-name').value;
            const prompt = document.getElementById('new-btn-prompt').value;
            if(name && prompt) {
                let stored = JSON.parse(localStorage.getItem('focus_macros_v2')) || defaultMacros;
                stored.push({name, prompt});
                localStorage.setItem('focus_macros_v2', JSON.stringify(stored));
                initMacros();
                document.getElementById('modal-overlay').style.display='none';
                document.getElementById('new-btn-name').value = '';
                document.getElementById('new-btn-prompt').value = '';
            }
        }

        // --- AI Chat Logic ---
        async function sendMsg() {
            const inp = document.getElementById('chat-input');
            const txt = inp.value.trim();
            if(!txt && !activeImg) return;
            
            const box = document.getElementById('chat-box');
            let userHTML = txt;
            if(activeImg) userHTML += `<br><img src="${activeImg}" style="max-height:120px;border-radius:8px;margin-top:8px;">`;
            
            box.innerHTML += `<div class="msg-bubble msg-user">${userHTML}</div>`;
            inp.value = ''; box.scrollTop = box.scrollHeight;
            
            const loader = document.createElement('div');
            loader.className = 'msg-bubble msg-ai text-blue-400 font-bold'; 
            loader.innerText = 'جاري التفكير...';
            box.appendChild(loader);

            let systemPrompt = "أنت مساعد ذكي ومفيد.";
            if(activePrompts.size > 0) {
                systemPrompt += " نفذ التعليمات التالية بدقة على النص أو الصورة:\n";
                activePrompts.forEach(p => systemPrompt += `- ${p}\n`);
            }

            let messages = [{role: "system", content: systemPrompt}];
            if(activeImg) {
                messages.push({role: "user", content: [{type: "text", text: txt || "قم بتحليل هذا."}, {type: "image_url", image_url: {url: activeImg}}]});
            } else {
                messages.push({role: "user", content: txt});
            }

            const activeModel = document.getElementById('model-id-input').value.trim() || "qwen/qwen2.5-vl-7b";

            try {
                const res = await fetch(AI_API, {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ model: activeModel, messages: messages, stream: false, max_tokens: 2000 })
                });
                const data = await res.json();
                loader.remove();
                if(activeImg) clearImg();

                const reply = data.choices[0].message.content.replace(/\n/g, '<br>');
                box.innerHTML += `
                    <div class="msg-bubble msg-ai">
                        ${reply}
                        <div class="mt-3 pt-2 border-t border-white/10 flex gap-3">
                            <button onclick="speakText(this.parentElement.parentElement.innerText)" class="text-yellow-400 hover:text-yellow-300" title="استماع">🔊</button>
                            <button onclick="navigator.clipboard.writeText(this.parentElement.parentElement.innerText); showToast('تم النسخ!')" class="text-gray-400 hover:text-white" title="نسخ">📋</button>
                        </div>
                    </div>`;
                box.scrollTop = box.scrollHeight;
            } catch(e) {
                loader.innerHTML = '<span class="text-red-400">خطأ في الاتصال بالخادم المحلي. تأكد من تشغيل LM Studio وتفعيل خيار CORS من الإعدادات.</span>';
            }
        }

        function toggleVoice() {
            if(!('webkitSpeechRecognition' in window)) return showToast('متصفحك لا يدعم التعرف على الصوت.');
            const r = new webkitSpeechRecognition(); r.lang='ar-SA'; r.start();
            document.getElementById('mic-btn').classList.add('text-red-500', 'animate-pulse');
            r.onresult = e => { document.getElementById('chat-input').value += e.results[0][0].transcript + " "; };
            r.onend = () => document.getElementById('mic-btn').classList.remove('text-red-500', 'animate-pulse');
        }

        function speakText(txt) {
            const cleanTxt = txt.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
            const u = new SpeechSynthesisUtterance(cleanTxt);
            window.speechSynthesis.speak(u);
        }

        function readSelection() {
            const sel = window.getSelection().toString();
            if(sel) { speakText(sel); } else { showToast("قم بتحديد النص من الكتاب أولاً ليتم قراءته."); }
        }

        document.getElementById('chat-input').addEventListener('paste', e => {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            for(let item of items) {
                if(item.type.indexOf("image")===0) {
                    const blob = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = ev => { activeImg = ev.target.result; document.getElementById('img-preview').src=activeImg; document.getElementById('img-preview-container').style.display='block'; };
                    reader.readAsDataURL(blob);
                }
            }
        });
        function handleImgSelect(e) { 
            const f = e.target.files[0]; if(!f) return;
            const r = new FileReader();
            r.onload = ev => { activeImg = ev.target.result; document.getElementById('img-preview').src = activeImg; document.getElementById('img-preview-container').style.display='block'; };
            r.readAsDataURL(f);
        }
        function clearImg() { activeImg=null; document.getElementById('img-preview-container').style.display='none'; }

        // --- Tools Sub Menus ---
        function toggleSub(id) {
            ['scroll-tools','pen-tools', 'cap-tools'].forEach(i => {
                const el = document.getElementById(i);
                if(el && i !== id + '-tools') { el.classList.remove('visible'); el.style.maxWidth = '0'; el.style.opacity = '0'; }
            });
            const target = document.getElementById(id + '-tools');
            if(target) {
                const isVis = target.classList.toggle('visible');
                target.style.maxWidth = isVis ? '600px' : '0';
                target.style.opacity = isVis ? '1' : '0';
            }
            if(id === 'pen') document.querySelectorAll('.draw-layer').forEach(l => { l.classList.add('active-drawing'); });
            else document.querySelectorAll('.draw-layer').forEach(l => { l.classList.remove('active-drawing'); });
        }

        // --- Toggle Flexible View ---
        function toggleFlex() {
            isFlexible = !isFlexible;
            const btn = document.getElementById('flex-btn');
            if (isFlexible) {
                document.body.classList.add('flexible-mode');
                document.documentElement.style.setProperty('--page-width', '98%');
                btn.innerHTML = "ثابت";
                if(pdfDoc) updateZoom();
            } else {
                document.body.classList.remove('flexible-mode');
                document.documentElement.style.setProperty('--page-width', '850px');
                currentZoom = 850;
                btn.innerHTML = "مرن";
                if(pdfDoc) updateZoom();
            }
        }

        // Zoom Functions
        function zoomIn() { 
            if(isFlexible) { isFlexible = false; document.body.classList.remove('flexible-mode'); document.getElementById('flex-btn').innerHTML = 'مرن';}
            if(currentZoom < 3000) { currentZoom += 100; updateZoom(); }
        }
        function zoomOut() { 
            if(isFlexible) { isFlexible = false; document.body.classList.remove('flexible-mode'); document.getElementById('flex-btn').innerHTML = 'مرن';}
            if(currentZoom > 400) { currentZoom -= 100; updateZoom(); }
        }
        function updateZoom() { 
            document.documentElement.style.setProperty('--page-width', `${currentZoom}px`); 
            if (pdfDoc) {
                document.querySelectorAll('.page-holder').forEach(h => {
                    h.removeAttribute('data-loaded');
                    h.innerHTML = '';
                });
                renderAllPages();
            }
        }

        function toggleInvert() {
            isNight = !isNight;
            document.body.classList.toggle('inverted-mode', isNight);
            const btn = document.getElementById('invert-btn');
            if(btn) btn.classList.toggle('active', isNight);
            showToast(isNight ? "الوضع الليلي" : "الوضع العادي");
        }

        // --- Pomodoro ---
        function togglePomo() {
            const btn = document.getElementById('pomo-play');
            if(isPomoRun) { clearInterval(pomoT); isPomoRun=false; btn.innerHTML='<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg>'; }
            else { 
                isPomoRun=true; btn.innerHTML='<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z"></path></svg>';
                pomoT = setInterval(() => {
                    if(pomoSec > 0) { pomoSec--; updatePomoUI(); }
                    else { 
                        clearInterval(pomoT); isPomoRun=false; 
                        const au = new AudioContext(); const o = au.createOscillator(); o.connect(au.destination); o.start(); setTimeout(()=>o.stop(),1000);
                        isBreak = !isBreak; pomoSec = isBreak ? 300 : 1500;
                        document.getElementById('pomo-icon').innerText = isBreak ? '☕' : '🍅';
                        showToast(isBreak ? "استراحة!" : "وقت القراءة");
                        updatePomoUI(); togglePomo(); 
                    }
                }, 1000);
            }
        }
        function resetPomo() { clearInterval(pomoT); isPomoRun=false; pomoSec=isBreak?300:1500; updatePomoUI(); document.getElementById('pomo-play').innerHTML='<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg>'; }
        function updatePomoUI() {
            const m = Math.floor(pomoSec/60).toString().padStart(2,'0');
            const s = (pomoSec%60).toString().padStart(2,'0');
            document.getElementById('header-pomo-time').innerText = `${m}:${s}`;
        }

        // --- File Handler ---
        const dropBox = document.getElementById('drop-overlay');
        window.addEventListener('dragenter', e => { e.preventDefault(); if(document.getElementById('section-library').style.display !== 'none') dropBox.classList.add('active'); });
        window.addEventListener('dragover', e => e.preventDefault());
        dropBox.addEventListener('dragleave', e => { if(e.target===dropBox) dropBox.classList.remove('active'); });
        window.addEventListener('drop', e => { e.preventDefault(); dropBox.classList.remove('active'); if(e.dataTransfer.files[0]) handleIn({target:{files:e.dataTransfer.files}}); });

        async function handleIn(e) {
            const f = e.target.files[0]; if(!f || f.type!=='application/pdf') return;
            document.getElementById('loading').style.display='flex';
            const reader = new FileReader();
            reader.onload = async function() {
                try {
                    const originalBuffer = this.result;
                    const bufferClone = originalBuffer.slice(0); 
                    
                    const task = pdfjsLib.getDocument({data:bufferClone, cMapUrl:'https://unpkg.com/pdfjs-dist@3.4.120/cmaps/', cMapPacked:true});
                    const pdf = await task.promise;
                    const p1 = await pdf.getPage(1);
                    const vp = p1.getViewport({scale:0.5});
                    const cvs = document.createElement('canvas'); cvs.width=vp.width; cvs.height=vp.height;
                    await p1.render({canvasContext:cvs.getContext('2d'), viewport:vp}).promise;
                    
                    const book = { id:'b_'+Date.now(), name:f.name, data:originalBuffer, last:1, total:pdf.numPages, thumb:cvs.toDataURL(), strokes:{} };
                    const tx = db.transaction('books','readwrite'); tx.objectStore('books').add(book);
                    tx.oncomplete = () => { document.getElementById('loading').style.display='none'; renderLib(); showToast("تم الحفظ"); };
                } catch(err) { document.getElementById('loading').style.display='none'; showToast("خطأ الملف"); }
            };
            reader.readAsArrayBuffer(f);
        }

        function renderLib() {
            const tx = db.transaction('books','readonly');
            tx.objectStore('books').getAll().onsuccess = e => {
                const list = document.getElementById('books-grid'); list.innerHTML='';
                const books = e.target.result;
                document.getElementById('empty-state').style.display = books.length ? 'none' : 'block';
                books.forEach(b => {
                    const div = document.createElement('div');
                    div.className = 'book-card p-4 flex flex-col gap-3 relative group';
                    div.onclick = (ev) => { if(!ev.target.closest('button')) openBook(b.id); };
                    div.innerHTML = `
                        <div class="relative overflow-hidden rounded-2xl">
                            <img src="${b.thumb}" class="w-full aspect-[3/4] object-cover group-hover:scale-110 transition duration-700">
                            <div class="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"><span class="bg-white text-blue-600 px-6 py-2 rounded-full font-bold shadow-xl">قراءة الآن</span></div>
                        </div>
                        <h3 class="font-bold text-sm truncate text-gray-200 text-right">${b.name}</h3>
                        <button onclick="askDel(event, '${b.id}')" class="absolute top-2 left-2 bg-black/60 p-2 rounded-xl text-red-400 opacity-0 group-hover:opacity-100 transition hover:bg-red-500 hover:text-white">✕</button>
                    `;
                    list.appendChild(div);
                });
            };
        }

        async function openBook(id, refresh = false) {
            const tx = db.transaction('books','readonly');
            tx.objectStore('books').get(id).onsuccess = async e => {
                const b = e.target.result; activeId = id; pageStrokes = b.strokes || {};
                
                if(!refresh) {
                    document.getElementById('section-library').style.display='none';
                    document.getElementById('section-reader').style.display='flex'; 
                    document.getElementById('reader-header').classList.add('show');
                }
                
                document.getElementById('loading').style.display='flex';
                const task = pdfjsLib.getDocument({data:b.data, cMapUrl:'https://unpkg.com/pdfjs-dist@3.4.120/cmaps/', cMapPacked:true});
                pdfDoc = await task.promise;
                document.getElementById('page-total').innerText = pdfDoc.numPages;
                
                await renderAllPages();
                
                if(!refresh) {
                    setTimeout(() => { const el = document.getElementById(`pg-${b.last || 1}`); if(el) el.scrollIntoView(); }, 300);
                }
            };
        }

        async function renderAllPages() {
            const cont = document.getElementById('pages-container'); 
            cont.innerHTML='';
            
            const mainW = document.getElementById('main-content').clientWidth;
            const targetWidth = isFlexible ? mainW * 0.96 : currentZoom; 
            document.documentElement.style.setProperty('--page-width', `${targetWidth}px`);
            
            const p1 = await pdfDoc.getPage(1);
            const ratio = p1.getViewport({scale: 1}).height / p1.getViewport({scale: 1}).width;
            const h = targetWidth * ratio;

            for(let i=1; i<=pdfDoc.numPages; i++) {
                const d = document.createElement('div');
                d.className='page-holder'; d.id=`pg-${i}`; d.dataset.num=i; d.style.height=h+'px';
                cont.appendChild(d);
            }

            if(pageObs) pageObs.disconnect();
            pageObs = new IntersectionObserver(ents => {
                ents.forEach(entry => {
                    if(entry.isIntersecting) {
                        renderPage(entry.target);
                        const inp = document.getElementById('page-inp');
                        if(inp && document.activeElement !== inp) inp.value = entry.target.dataset.num;
                        
                        const tx2 = db.transaction('books','readwrite');
                        tx2.objectStore('books').get(activeId).onsuccess = ex => {
                            const bk = ex.target.result; bk.last = parseInt(entry.target.dataset.num);
                            tx2.objectStore('books').put(bk);
                        };
                    } else {
                         if(entry.target.querySelector('canvas')) entry.target.innerHTML = '';
                    }
                });
            }, {rootMargin:'1000px'});
            
            document.querySelectorAll('.page-holder').forEach(el => pageObs.observe(el));
            document.getElementById('loading').style.display='none';
        }

        async function renderPage(holder) {
            if(holder.querySelector('canvas')) return;
            const num = parseInt(holder.dataset.num);
            const page = await pdfDoc.getPage(num);
            
            // الوضوح العالي (دعم التكبير بدون بكسلة)
            const dpr = window.devicePixelRatio || 1;
            const mainW = document.getElementById('main-content').clientWidth;
            const targetWidth = isFlexible ? mainW * 0.96 : currentZoom;
            
            const unscaledViewport = page.getViewport({ scale: 1 });
            const baseScale = targetWidth / unscaledViewport.width;
            const viewport = page.getViewport({ scale: baseScale * dpr });
            
            holder.style.height = (viewport.height / dpr) + 'px';

            const cvs = document.createElement('canvas'); cvs.className='pdf-canvas';
            cvs.width=viewport.width; cvs.height=viewport.height;
            const ctx = cvs.getContext('2d', {alpha:false});
            
            const tLayer = document.createElement('div'); tLayer.className='textLayer';
            const dLayer = document.createElement('canvas'); dLayer.className='draw-layer';
            dLayer.width=viewport.width; dLayer.height=viewport.height;

            holder.appendChild(cvs); holder.appendChild(tLayer); holder.appendChild(dLayer);
            await page.render({canvasContext:ctx, viewport:viewport}).promise;
            
            const txt = await page.getTextContent();
            pdfjsLib.renderTextLayer({textContent:txt, container:tLayer, viewport: page.getViewport({ scale: baseScale }), textDivs:[]});
            
            drawStrokes(num, dLayer);
            initDraw(num, dLayer, dpr, baseScale);
        }

        function drawStrokes(num, cvs) {
            if(!pageStrokes[num]) return;
            const ctx = cvs.getContext('2d'); ctx.clearRect(0,0,cvs.width,cvs.height);
            pageStrokes[num].forEach(s => {
                if(s.mode === 'rect') {
                    ctx.fillStyle = s.color; ctx.globalAlpha = 0.3; ctx.fillRect(s.x*cvs.width, s.y*cvs.height, s.w*cvs.width, s.h*cvs.height);
                    ctx.globalAlpha = 1; if(s.brace && s.brace !== 'none') drawBraces(ctx, s.x*cvs.width, s.y*cvs.height, s.h*cvs.height, s.w*cvs.width, s.brace);
                } else {
                    ctx.beginPath(); ctx.strokeStyle = s.mode==='eraser'?'rgba(0,0,0,1)':s.color; 
                    ctx.lineWidth = (s.size/1000)*cvs.width; ctx.lineCap='round';
                    if(s.mode==='eraser') ctx.globalCompositeOperation='destination-out'; else ctx.globalCompositeOperation='multiply';
                    if(s.pts && s.pts.length > 0) { ctx.moveTo(s.pts[0][0]*cvs.width, s.pts[0][1]*cvs.height); s.pts.forEach(p => ctx.lineTo(p[0]*cvs.width, p[1]*cvs.height)); ctx.stroke(); }
                    ctx.globalCompositeOperation='source-over';
                }
            });
        }

        function drawBraces(ctx, x, y, h, w, side) {
            ctx.strokeStyle = 'black'; ctx.lineWidth = 4; ctx.lineCap = 'round';
            if(side === 'both' || side === 'left') {
                ctx.beginPath(); ctx.moveTo(x+10, y); ctx.quadraticCurveTo(x, y, x, y+10); ctx.lineTo(x, y+h/2-10); ctx.quadraticCurveTo(x, y+h/2, x-10, y+h/2);
                ctx.quadraticCurveTo(x, y+h/2, x, y+h/2+10); ctx.lineTo(x, y+h-10); ctx.quadraticCurveTo(x, y+h, x+10, y+h); ctx.stroke();
            }
            if(side === 'both' || side === 'right') {
                const rx = x+w; ctx.beginPath(); ctx.moveTo(rx-10, y); ctx.quadraticCurveTo(rx, y, rx, y+10); ctx.lineTo(rx, y+h/2-10); ctx.quadraticCurveTo(rx, y+h/2, rx+10, y+h/2);
                ctx.quadraticCurveTo(rx, y+h/2, rx, y+h/2+10); ctx.lineTo(rx, y+h-10); ctx.quadraticCurveTo(rx, y+h, rx-10, y+h); ctx.stroke();
            }
        }

        function initDraw(num, cvs, dpr, baseScale) {
            const ctx = cvs.getContext('2d');
            const getXY = e => { const r=cvs.getBoundingClientRect(); return {x: (e.clientX-r.left)*dpr, y: (e.clientY-r.top)*dpr}; };
            const start = e => {
                const tools = document.getElementById('pen-tools');
                if(!tools || !tools.classList.contains('visible')) return;
                isPainting = true; startPos = getXY(e);
                if(!pageStrokes[num]) pageStrokes[num] = [];
                if(drawMode === 'rect') pageStrokes[num].push({ mode:'rect', color:brushColor, brace:braceSide, x:startPos.x/cvs.width, y:startPos.y/cvs.height, w:0, h:0 });
                else pageStrokes[num].push({ mode:drawMode, color:brushColor, size:brushSize, pts:[[startPos.x/cvs.width, startPos.y/cvs.height]] });
            };
            const move = e => {
                if(!isPainting) return;
                const p = getXY(e);
                if(drawMode === 'rect') {
                    const last = pageStrokes[num][pageStrokes[num].length-1];
                    last.w = (p.x - startPos.x)/cvs.width; last.h = (p.y - startPos.y)/cvs.height;
                    drawStrokes(num, cvs);
                } else {
                    const last = pageStrokes[num][pageStrokes[num].length-1];
                    last.pts.push([p.x/cvs.width, p.y/cvs.height]);
                    drawStrokes(num, cvs);
                }
            };
            const end = () => { isPainting=false; const tx = db.transaction('books','readwrite'); tx.objectStore('books').get(activeId).onsuccess = e => { const b = e.target.result; b.strokes = pageStrokes; tx.objectStore('books').put(b); }; };
            cvs.onmousedown = start; window.onmousemove = move; window.onmouseup = end;
        }

        // Utils
        function setBrushColor(c, el) { brushColor = c; document.querySelectorAll('.color-dot').forEach(d=>d.classList.remove('active')); el.classList.add('active'); }
        function setMode(m) { drawMode = m; document.querySelectorAll('#pen-tools .glass-btn').forEach(b=>b.classList.remove('active')); const btn = document.getElementById(`mode-${m}`); if(btn) btn.classList.add('active'); }
        function setBraceSide(s) { braceSide = s; document.querySelectorAll('.brace-toggle-btn').forEach(b=>b.classList.remove('active')); event.target.classList.add('active'); }
        function handleUndo() { const n = document.getElementById('page-inp').value; if(pageStrokes[n]?.length) { pageStrokes[n].pop(); drawStrokes(n, document.querySelector(`#pg-${n} canvas.draw-layer`)); } }
        
        function toggleAutoScroll() { 
            autoScroll = !autoScroll; const btn = document.getElementById('scroll-play-btn');
            if(autoScroll) { 
                btn.innerHTML = '<i class="fas fa-pause text-xs"></i>'; 
                scrollFraction = 0;
                scrollFrame = requestAnimationFrame(doScroll); 
            } 
            else { 
                btn.innerHTML = '<i class="fas fa-play text-xs"></i>'; 
                cancelAnimationFrame(scrollFrame); 
            }
        }
        function updateScrollSpeed(v) { scrollSpeed = v; }
        
        function doScroll() { 
            if(!autoScroll) return; 
            // جعل السكرول بطيئاً جداً ليتناسب مع سرعة القراءة بناءً على مؤشر الـ Range
            let speedModifier = scrollSpeed * 0.05; 
            scrollFraction += speedModifier;
            if (scrollFraction >= 1) {
                let px = Math.floor(scrollFraction);
                document.getElementById('reader-scroll').scrollTop += px;
                scrollFraction -= px;
            }
            scrollFrame = requestAnimationFrame(doScroll); 
        }

        function closeReader() { 
            isAutoScrolling=false; cancelAnimationFrame(scrollFrame); 
            document.getElementById('section-reader').style.display='none'; 
            document.getElementById('section-library').style.display='flex'; 
            renderLib(); 
        }

        function showToast(m) { const t=document.getElementById('toast'); if(t) { t.innerText=m; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'), 2000); } }
        function jump(v) { const el=document.getElementById(`pg-${v}`); if(el) el.scrollIntoView(); }
        
        let delId=null;
        function askDel(e, id) { e.stopPropagation(); delId=id; document.getElementById('confirm-modal').style.display='flex'; }
        document.addEventListener('DOMContentLoaded', () => {
            const delBtn = document.getElementById('del-yes');
            if(delBtn) {
                delBtn.onclick = () => { const tx = db.transaction('books','readwrite'); tx.objectStore('books').delete(delId).onsuccess = () => { document.getElementById('confirm-modal').style.display='none'; renderLib(); }; };
            }
        });
        function closeModal() { document.getElementById('confirm-modal').style.display='none'; }
        
        function updateCursor(e) { 
            const c=document.getElementById('brush-cursor'); if(!c) return;
            const over=e.target.classList.contains('draw-layer'); 
            const tools = document.getElementById('pen-tools');
            if(!over || !tools || !tools.classList.contains('visible')) { c.style.display='none'; return; }
            c.style.display='block'; c.style.left=e.clientX+'px'; c.style.top=e.clientY+'px';
            c.style.width=brushSize+'px'; c.style.height=brushSize+'px';
            c.style.marginLeft=-(brushSize/2)+'px'; c.style.marginTop=-(brushSize/2)+'px';
            c.style.backgroundColor=(drawMode==='eraser'?'rgba(255,255,255,0.2)':brushColor); 
        }
        window.addEventListener('mousemove', updateCursor);

        // --- القص والتصوير ---
        function captureFull() {
            const n = document.getElementById('page-inp').value; const holder = document.getElementById(`pg-${n}`); if(!holder) return;
            const pc = holder.querySelector('.pdf-canvas'), dc = holder.querySelector('.draw-layer'); if(!pc) return;
            const f = document.createElement('canvas'); f.width=pc.width; f.height=pc.height; const c = f.getContext('2d');
            if(document.body.classList.contains('inverted-mode')) { c.filter='invert(100%) hue-rotate(180deg)'; c.drawImage(pc,0,0); c.filter='none'; } else c.drawImage(pc,0,0);
            if(dc) { c.globalCompositeOperation = document.body.classList.contains('inverted-mode')?'screen':'multiply'; c.drawImage(dc,0,0); }
            const a = document.createElement('a'); a.download=`صفحة_${n}.png`; a.href=f.toDataURL(); a.click(); showToast("تم حفظ الصورة");
        }

        function startCrop() { isCrop = !isCrop; document.body.classList.toggle('crop-active', isCrop); showToast(isCrop ? "حدد المنطقة للقص" : "تم إلغاء القص"); }
        function startC(e) { const root = document.getElementById('reader-scroll'); startPos = { x: e.clientX, y: e.clientY, s: root.scrollTop }; document.getElementById('selection-rect').style.display='block'; isPainting=true; }
        function moveC(e) {
            if(!isPainting) return;
            const r = document.getElementById('selection-rect'); const root = document.getElementById('reader-scroll');
            const diff = root.scrollTop - startPos.s; const w = e.clientX - startPos.x; const h = (e.clientY - startPos.y) + diff;
            r.style.left = (w>0 ? startPos.x : e.clientX) + 'px'; r.style.top = (h>0 ? startPos.y : e.clientY) + 'px'; r.style.width = Math.abs(w) + 'px'; r.style.height = Math.abs(h) + 'px';
        }
        async function endC() { document.getElementById('selection-rect').style.display='none'; isCrop=false; document.body.classList.remove('crop-active'); isPainting = false; showToast("تم التحديد. لنسخ النص كصورة استخدم اختصار الويندوز Windows+Shift+S"); }

    </script>
</body>
</html>