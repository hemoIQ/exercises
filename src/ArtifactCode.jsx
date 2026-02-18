<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart PDF Reader - Focus AI</title>
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
            --page-width: 850px;
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

        /* --- الحاويات --- */
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

        /* --- الهيدر --- */
        .library-header {
            height: 90px; padding: 0 3rem;
            display: flex; align-items: center; justify-content: space-between;
            background: rgba(2, 6, 23, 0.8); backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--glass-border);
        }

        #reader-header {
            position: fixed; top: 0; left: 0; right: 0; height: 80px;
            background: var(--glass-bg); backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--glass-border);
            display: flex; align-items: center; padding: 0 2rem;
            z-index: 5000; transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            transform: translateY(-100%);
        }
        #reader-header.show { transform: translateY(0); }

        /* --- المحتوى --- */
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
            width: var(--page-width); max-width: 98%;
            display: block; flex-shrink: 0; border-radius: 8px;
            transition: width 0.3s ease; direction: ltr; 
        }

        body.flexible-mode .page-holder { width: 98% !important; max-width: 98% !important; }

        /* --- الطبقات --- */
        .pdf-canvas { width: 100%; height: 100%; display: block; position: absolute; top: 0; left: 0; z-index: 1; }
        .textLayer {
            position: absolute; left: 0; top: 0; right: 0; bottom: 0;
            overflow: hidden; opacity: 1; line-height: 1.0; 
            z-index: 5; mix-blend-mode: multiply; pointer-events: auto;
        }
        .textLayer span { color: transparent; position: absolute; white-space: pre; cursor: text; transform-origin: 0% 0%; }
        .textLayer ::selection { background: rgba(59, 130, 246, 0.3); color: transparent; }
        .draw-layer {
            position: absolute; inset: 0; z-index: 10;
            pointer-events: none; touch-action: none; mix-blend-mode: multiply;
        }
        .draw-layer.active-drawing { pointer-events: auto; z-index: 20; }

        /* --- الوضع الليلي --- */
        .inverted-mode .page-holder { background: #000; border: 1px solid #333; }
        .inverted-mode .pdf-canvas { filter: invert(1) hue-rotate(180deg) contrast(0.9); }
        .inverted-mode .textLayer { filter: invert(1); }
        .inverted-mode .draw-layer { mix-blend-mode: screen; }

        /* --- الأزرار --- */
        .glass-btn {
            background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border);
            border-radius: 12px; cursor: pointer; transition: all 0.3s;
            display: flex; align-items: center; justify-content: center; min-width: 40px; height: 40px;
        }
        .glass-btn:hover { background: rgba(255,255,255,0.15); border-color: var(--accent-blue); transform: translateY(-2px); }
        .glass-btn.active { background: var(--accent-blue); color: white; border-color: transparent; box-shadow: 0 0 15px rgba(59, 130, 246, 0.4); }

        .sub-tools {
            max-width: 0; overflow: hidden; opacity: 0; transition: all 0.4s ease;
            display: flex; align-items: center; gap: 8px; margin-right: 10px;
        }
        .sub-tools.visible { max-width: 800px; opacity: 1; }

        #drop-overlay { display: none; position: fixed; inset: 0; z-index: 10000; justify-content: center; align-items: center; backdrop-filter: blur(30px); background: rgba(2,6,23,0.95); }
        #drop-overlay.active { display: flex; }
        .drop-box { border: 4px dashed var(--accent-blue); padding: 80px; border-radius: 50px; text-align: center; }

        .color-dot { width: 20px; height: 20px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; }
        .color-dot.active { border-color: white; transform: scale(1.2); }
        .pomo-font { font-family: 'JetBrains Mono', monospace; }
        .brace-toggle-btn { font-size: 10px; font-weight: bold; padding: 4px 8px; border-radius: 6px; background: rgba(255,255,255,0.1); transition: 0.3s; }
        .brace-toggle-btn.active { background: var(--accent-blue); color: white; }
        #brush-cursor { position: fixed; pointer-events: none; z-index: 9999; display: none; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 15px rgba(255,255,255,0.5); }
        .crop-active { cursor: crosshair !important; }
        #loading { display: none; position: fixed; inset: 0; z-index: 9999; justify-content: center; align-items: center; background: rgba(0,0,0,0.9); }
        .book-card { background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 20px; overflow: hidden; transition: transform 0.3s; cursor: pointer; }
        .book-card:hover { transform: translateY(-5px); border-color: var(--accent-blue); }
        #mini-page-num { position: fixed; bottom: 10px; left: 15px; z-index: 4000; background: rgba(0,0,0,0.6); padding: 6px 12px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: rgba(255,255,255,0.8); pointer-events: none; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(5px); }

        /* === نافذة الشات === */
        #chat-widget {
            position: fixed; bottom: 80px; left: 20px; width: 380px; height: 500px;
            background: rgba(15, 23, 42, 0.98); backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px; z-index: 6000;
            display: none; flex-direction: column;
            box-shadow: 0 20px 50px rgba(0,0,0,0.8);
            transform-origin: bottom left;
            animation: slideUpChat 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideUpChat { from { transform: scale(0.9) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        
        .chat-header { padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); border-radius: 24px 24px 0 0; }
        .chat-messages { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 12px; }
        .chat-input-area { padding: 15px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; gap: 10px; }
        .chat-input { flex: 1; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px 15px; color: white; outline: none; font-size: 13px; direction: rtl; }
        .chat-input:focus { border-color: var(--accent-blue); }
        
        .message-bubble { padding: 10px 14px; border-radius: 14px; max-width: 85%; font-size: 13px; line-height: 1.5; word-wrap: break-word; }
        .msg-user { align-self: flex-start; background: var(--accent-blue); color: white; border-bottom-right-radius: 2px; }
        .msg-ai { align-self: flex-end; background: rgba(255,255,255,0.08); color: #e2e8f0; border-bottom-left-radius: 2px; border: 1px solid rgba(255,255,255,0.05); }
        .typing-indicator span { display: inline-block; width: 6px; height: 6px; background: #aaa; border-radius: 50%; margin: 0 2px; animation: bounce 1.4s infinite ease-in-out both; }
        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
    </style>
</head>
<body class="natural-view mode-read">

    <div id="brush-cursor"></div>
    <div id="selection-rect"></div>
    <div id="drop-overlay"><div class="drop-box"><h2 class="text-6xl font-black mb-4 text-white">أفلت كتابك هنا</h2></div></div>
    <div id="loading"><div class="text-center"><div class="w-20 h-20 border-4 border-t-blue-500 rounded-full animate-spin mb-6 mx-auto"></div><p class="text-blue-400 font-bold tracking-widest">LOADING</p></div></div>
    <div id="toast" class="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 border border-white/10 px-8 py-4 rounded-full shadow-2xl hidden z-[9000] font-bold text-white"></div>
    <div id="mini-page-num" class="hidden"><span id="mini-curr">0</span> / <span id="mini-total">0</span></div>

    <!-- نافذة الشات AI -->
    <div id="chat-widget">
        <div class="chat-header">
            <div class="flex items-center gap-2">
                <span class="text-xl">🐬</span>
                <h3 class="font-bold text-sm text-gray-200">Dolphin AI</h3>
            </div>
            <button onclick="toggleChat()" class="text-gray-400 hover:text-white transition">✕</button>
        </div>
        <div class="chat-messages custom-scrollbar" id="chat-box">
            <div class="message-bubble msg-ai">أهلاً بك! جاهز لتحليل النص.</div>
        </div>
        <div class="chat-input-area">
            <button onclick="sendChatMessage()" class="glass-btn !w-10 !h-10 !bg-blue-600 hover:!bg-blue-500 !border-0 text-white">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
            </button>
            <input type="text" id="chat-input" class="chat-input" placeholder="اكتب سؤالك..." onkeydown="if(event.key==='Enter') sendChatMessage()">
        </div>
    </div>

    <div id="app-container">
        
        <!-- المكتبة -->
        <div id="section-library">
            <header class="library-header">
                <div class="flex items-center gap-4">
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

            <div class="flex-1 overflow-y-auto p-12 no-scrollbar">
                <div class="max-w-[1600px] mx-auto text-right">
                    <div class="mb-16 pb-8 border-b border-white/5">
                        <h2 class="text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-l from-white to-slate-500">مكتبتي</h2>
                    </div>
                    <div id="books-grid" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10"></div>
                    <div id="empty-state" class="hidden text-center py-20 text-gray-500 text-2xl">المكتبة فارغة.. اسحب ملف هنا</div>
                </div>
            </div>
        </div>

        <!-- القارئ -->
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
                    <div class="flex items-center bg-white/5 rounded-2xl p-1 border border-white/5">
                        <div class="flex items-center gap-2 px-3 border-l border-white/10 pl-3">
                            <span id="pomo-icon" class="text-lg">🍅</span>
                            <span id="header-pomo-time" class="pomo-font text-blue-400 font-bold">25:00</span>
                        </div>
                        <button onclick="togglePomo()" id="pomo-btn" class="glass-btn w-9 h-9 rounded-lg !border-0 hover:text-green-400"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg></button>
                        <button onclick="resetPomo()" class="glass-btn w-9 h-9 rounded-lg !border-0 hover:text-red-400"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button>
                    </div>

                    <button onclick="toggleChat()" class="glass-btn w-auto px-4 gap-2 text-purple-300 font-bold border-purple-500/30 hover:bg-purple-500/10">
                        <span class="text-lg">🐬</span> شات AI
                    </button>

                    <div class="w-px h-8 bg-white/10 mx-1"></div>

                    <div class="flex items-center">
                        <button onclick="toggleSub('scroll')" class="glass-btn"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 13l-7 7-7-7m14-8l-7 7-7-7"></path></svg></button>
                        <div id="scroll-tools" class="sub-tools bg-black/40 rounded-xl p-1 ml-2 border border-white/10">
                            <input type="range" min="1" max="100" value="5" oninput="scrollSpeed=this.value" class="w-20 h-1 accent-blue-500 cursor-pointer mx-2">
                            <button id="scroll-play-btn" onclick="toggleAutoScroll()" class="glass-btn w-8 h-8 rounded-lg"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg></button>
                        </div>
                    </div>

                    <div class="flex items-center">
                        <button onclick="toggleSub('pen')" class="glass-btn"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" stroke-width="2.5" stroke-linecap="round"></path></svg></button>
                        <div id="pen-tools" class="sub-tools bg-black/40 p-1 rounded-xl border border-white/10">
                            <div class="flex gap-2 px-2 border-l border-white/10">
                                <div onclick="setBrushColor('#ffff00', this)" class="color-dot bg-yellow-400 active"></div>
                                <div onclick="setBrushColor('#4ade80', this)" class="color-dot bg-green-500"></div>
                                <div onclick="setBrushColor('#60a5fa', this)" class="color-dot bg-blue-400"></div>
                            </div>
                            <button onclick="setMode('rect')" id="mode-rect" class="glass-btn w-8 h-8 rounded-lg" title="أقواس { }"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2.5"></rect></svg></button>
                            <button onclick="setMode('free')" id="mode-free" class="glass-btn w-8 h-8 rounded-lg active"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" stroke-width="2.5"></path></svg></button>
                            <button onclick="setMode('eraser')" id="mode-eraser" class="glass-btn w-8 h-8 rounded-lg"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11l-8-8-7 7 8 8 7-7zM12 19l7 7" stroke-width="2.5"></path></svg></button>
                            <button onclick="handleUndo()" class="glass-btn w-8 h-8 rounded-lg text-red-400"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" stroke-width="2.5"></path></svg></button>
                            <div class="flex gap-1 pr-1 border-r border-white/10">
                                <button onclick="setBraceSide('left')" class="brace-toggle-btn">{</button>
                                <button onclick="setBraceSide('both')" class="brace-toggle-btn active">{ }</button>
                                <button onclick="setBraceSide('right')" class="brace-toggle-btn">}</button>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center">
                        <button onclick="toggleSub('cap')" class="glass-btn"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke-width="2.5"></path><circle cx="12" cy="13" r="4" stroke-width="2.5"></circle></svg></button>
                        <div id="cap-tools" class="sub-tools bg-black/40 rounded-xl p-1 ml-2 border border-white/10">
                            <button onclick="captureFull()" class="glass-btn w-auto px-3 text-[10px] font-bold whitespace-nowrap">كاملة</button>
                            <button onclick="startCrop()" id="btn-crop" class="glass-btn w-auto px-3 text-[10px] font-bold whitespace-nowrap">قص مطول</button>
                        </div>
                    </div>

                    <div class="flex items-center bg-black/40 px-3 py-1.5 rounded-xl gap-2 border border-white/10">
                        <input type="number" id="page-inp" value="1" onchange="jump(this.value)" class="bg-transparent w-8 text-center text-white font-bold focus:outline-none text-sm">
                    </div>
                </div>
            </header>

            <div id="reader-scroll" class="no-scrollbar">
                <div id="pages-container"></div>
            </div>
        </div>
    </div>

    <!-- نافذة الحذف -->
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
        // إعدادات الـ API
        const AI_API_URL = "http://127.0.0.1:1234/v1/chat/completions"; 
        const AI_MODEL = "dolphin-x1-8b";

        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js';

        let db, pdfDoc, activeId, pageObs;
        let brushColor='#ffff00', brushSize=45, drawMode='free', pageStrokes={}, braceSide='both';
        let isPainting=false, startPos={}, isCrop=false;
        let autoScroll=false, scrollSpeed=5, scrollFrame;
        let pomoT, pomoSec=1500, isPomoRun=false, isBreak=false;
        let isNight = false, isFlexible = false;

        const req = indexedDB.open("SmartReader_Focus_AI_Final_v1", 1);
        req.onupgradeneeded = e => { db=e.target.result; if(!db.objectStoreNames.contains('books')) db.createObjectStore('books',{keyPath:'id'}); };
        req.onsuccess = e => { db=e.target.result; renderLib(); };

        const header = document.getElementById('reader-header');
        window.addEventListener('mousemove', e => {
            if(document.getElementById('section-reader').style.display === 'flex') {
                if(e.clientY < 60 || e.target.closest('header')) header.classList.add('show');
                else if(!e.target.closest('.sub-tools') && !document.getElementById('chat-widget').contains(e.target)) header.classList.remove('show');
            }
        });

        // Chat
        function toggleChat() {
            const chat = document.getElementById('chat-widget');
            chat.style.display = (chat.style.display === 'flex') ? 'none' : 'flex';
        }
        async function sendChatMessage() {
            const input = document.getElementById('chat-input');
            const msg = input.value.trim();
            if(!msg) return;
            
            const chatBox = document.getElementById('chat-box');
            chatBox.innerHTML += `<div class="message-bubble msg-user">${msg}</div>`;
            input.value = '';
            
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'message-bubble msg-ai typing-indicator';
            loadingDiv.innerHTML = '<span></span><span></span><span></span>';
            chatBox.appendChild(loadingDiv);
            chatBox.scrollTop = chatBox.scrollHeight;

            try {
                const response = await fetch(AI_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: AI_MODEL,
                        messages: [
                            { role: "system", content: "أنت مساعد ذكي." },
                            { role: "user", content: msg }
                        ]
                    })
                });
                
                if (!response.ok) throw new Error('فشل');
                const data = await response.json();
                loadingDiv.remove();
                chatBox.innerHTML += `<div class="message-bubble msg-ai">${data.choices[0].message.content.replace(/\n/g, '<br>')}</div>`;
                chatBox.scrollTop = chatBox.scrollHeight;
            } catch(e) {
                loadingDiv.remove();
                chatBox.innerHTML += `<div class="message-bubble msg-ai text-red-400">تأكد من تشغيل السيرفر المحلي.</div>`;
            }
        }

        function toggleFlex() {
            isFlexible = !isFlexible;
            const btn = document.getElementById('flex-btn');
            if (isFlexible) {
                document.body.classList.add('flexible-mode');
                document.documentElement.style.setProperty('--page-width', '98%');
                btn.innerText = "طبيعي";
                openBook(activeId, true);
            } else {
                document.body.classList.remove('flexible-mode');
                document.documentElement.style.setProperty('--page-width', '850px');
                btn.innerText = "عرض مرن";
                openBook(activeId, true);
            }
        }

        function toggleInvert() {
            isNight = !isNight;
            document.body.classList.toggle('inverted-mode', isNight);
            const btn = document.getElementById('invert-btn');
            if(btn) btn.classList.toggle('active', isNight);
            showToast(isNight ? "الوضع الليلي" : "الوضع العادي");
        }

        function togglePomo() {
            const btn = document.getElementById('pomo-btn');
            if(isPomoRun) { clearInterval(pomoT); isPomoRun=false; btn.innerHTML='<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg>'; }
            else { 
                isPomoRun=true; btn.innerHTML='<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z"></path></svg>';
                pomoT = setInterval(() => {
                    if(pomoSec > 0) { pomoSec--; updatePomoUI(); }
                    else { 
                        clearInterval(pomoT); isPomoRun=false; 
                        const au = new AudioContext(); const o = au.createOscillator(); o.connect(au.destination); o.start(); setTimeout(()=>o.stop(),1000);
                        isBreak = !isBreak; pomoSec = isBreak ? 300 : 1500;
                        showToast(isBreak ? "استراحة!" : "وقت القراءة");
                        updatePomoUI(); togglePomo(); 
                    }
                }, 1000);
            }
        }
        function resetPomo() { clearInterval(pomoT); isPomoRun=false; pomoSec=isBreak?300:1500; updatePomoUI(); document.getElementById('pomo-btn').innerHTML='<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg>'; }
        function updatePomoUI() {
            const m = Math.floor(pomoSec/60).toString().padStart(2,'0');
            const s = (pomoSec%60).toString().padStart(2,'0');
            document.getElementById('header-pomo-time').innerText = `${m}:${s}`;
        }

        function toggleSub(id) {
            ['scroll-tools','pen-tools','cap-tools'].forEach(i => {
                const el = document.getElementById(i);
                if(el && i !== id + '-tools') { el.classList.remove('visible'); el.style.maxWidth = '0'; el.style.opacity = '0'; }
            });
            const target = document.getElementById(id + '-tools');
            if(target) {
                const isVis = target.classList.toggle('visible');
                target.style.maxWidth = isVis ? '600px' : '0';
                target.style.opacity = isVis ? '1' : '0';
            }
            if(id === 'pen') document.querySelectorAll('.draw-layer').forEach(l => l.classList.add('active-drawing'));
            else document.querySelectorAll('.draw-layer').forEach(l => l.classList.remove('active-drawing'));
        }

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
                    const bufferClone = this.result.slice(0); 
                    const task = pdfjsLib.getDocument({data:bufferClone, cMapUrl:'https://unpkg.com/pdfjs-dist@3.4.120/cmaps/', cMapPacked:true});
                    const pdf = await task.promise;
                    const p1 = await pdf.getPage(1);
                    const vp = p1.getViewport({scale:0.5});
                    const cvs = document.createElement('canvas'); cvs.width=vp.width; cvs.height=vp.height;
                    await p1.render({canvasContext:cvs.getContext('2d'), viewport:vp}).promise;
                    
                    const book = { id:'b_'+Date.now(), name:f.name, data:this.result, last:1, total:pdf.numPages, thumb:cvs.toDataURL(), strokes:{} };
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
                        <button onclick="askDel(event, '${b.id}')" class="absolute top-2 left-2 bg-black/60 p-2 rounded-xl text-red-400 opacity-0 group-hover:opacity-100 transition hover:bg-red-500 hover:text-white"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
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
                    const reader = document.getElementById('section-reader');
                    reader.style.display='flex'; 
                    document.getElementById('reader-header').classList.add('show');
                    document.getElementById('mini-page-num').classList.remove('hidden'); 
                }
                
                document.getElementById('loading').style.display='flex';
                const task = pdfjsLib.getDocument({data:b.data, cMapUrl:'https://unpkg.com/pdfjs-dist@3.4.120/cmaps/', cMapPacked:true});
                pdfDoc = await task.promise;
                document.getElementById('mini-total').innerText = pdfDoc.numPages;
                
                const cont = document.getElementById('pages-container'); cont.innerHTML='';
                const p1 = await pdfDoc.getPage(1);
                
                let w = '850px';
                if(isFlexible) w = '98%';
                
                const ratio = p1.getViewport({scale:1}).height / p1.getViewport({scale:1}).width;
                const baseW = isFlexible ? window.innerWidth * 0.98 : 850;
                const h = baseW * ratio;

                for(let i=1; i<=pdfDoc.numPages; i++) {
                    const d = document.createElement('div');
                    d.className='page-holder'; d.id=`pg-${i}`; d.dataset.num=i; d.style.height=h+'px';
                    if(isFlexible) { d.style.width='98%'; d.style.maxWidth='98%'; }
                    else { d.style.width='850px'; d.style.maxWidth='95%'; }
                    cont.appendChild(d);
                }

                if(pageObs) pageObs.disconnect();
                pageObs = new IntersectionObserver(ents => {
                    ents.forEach(entry => {
                        if(entry.isIntersecting) {
                            renderPage(entry.target);
                            const num = entry.target.dataset.num;
                            document.getElementById('mini-curr').innerText = num;
                            
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
                if(!refresh) setTimeout(() => { const el = document.getElementById(`pg-${b.last}`); if(el) el.scrollIntoView(); document.getElementById('loading').style.display='none'; }, 200);
                else document.getElementById('loading').style.display='none';
            };
        }

        async function renderPage(holder) {
            if(holder.querySelector('canvas')) return;
            const num = parseInt(holder.dataset.num);
            const page = await pdfDoc.getPage(num);
            
            const dpr = window.devicePixelRatio || 1;
            const scale = (holder.clientWidth / page.getViewport({scale:1}).width) * dpr;
            const vp = page.getViewport({scale});
            
            holder.style.height = (vp.height / dpr) + 'px';

            const cvs = document.createElement('canvas'); cvs.className='pdf-canvas';
            cvs.width=vp.width; cvs.height=vp.height;
            const ctx = cvs.getContext('2d', {alpha:true});
            ctx.imageSmoothingEnabled = false; 
            
            const tLayer = document.createElement('div'); tLayer.className='textLayer';
            const dLayer = document.createElement('canvas'); dLayer.className='draw-layer';
            dLayer.width=vp.width; dLayer.height=vp.height;

            holder.appendChild(cvs); holder.appendChild(tLayer); holder.appendChild(dLayer);
            await page.render({canvasContext:ctx, viewport:vp, intent:'print'}).promise;
            
            const txt = await page.getTextContent();
            pdfjsLib.renderTextLayer({textContent:txt, container:tLayer, viewport:vp, textDivs:[]});
            
            drawStrokes(num, dLayer);
            initDraw(num, dLayer);
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
                    if(s.pts) { ctx.moveTo(s.pts[0][0]*cvs.width, s.pts[0][1]*cvs.height); s.pts.forEach(p => ctx.lineTo(p[0]*cvs.width, p[1]*cvs.height)); ctx.stroke(); }
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

        function initDraw(num, cvs) {
            const ctx = cvs.getContext('2d');
            const getXY = e => { const r=cvs.getBoundingClientRect(); return {x:e.clientX-r.left, y:e.clientY-r.top}; };
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
        function handleUndo() { const n = document.getElementById('mini-curr').innerText; if(pageStrokes[n]?.length) { pageStrokes[n].pop(); drawStrokes(n, document.querySelector(`#pg-${n} canvas.draw-layer`)); } }
        
        function toggleAutoScroll() { 
            autoScroll = !autoScroll; const btn = document.getElementById('scroll-play-btn');
            if(autoScroll) { btn.innerHTML = '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z"></path></svg>'; scrollFrame = requestAnimationFrame(doScroll); } 
            else { btn.innerHTML = '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg>'; cancelAnimationFrame(scrollFrame); }
        }
        function updateScrollSpeed(v) { scrollSpeed = v; }
        function doScroll() { if(!autoScroll) return; document.getElementById('reader-scroll').scrollTop += (scrollSpeed * 0.05); scrollFrame = requestAnimationFrame(doScroll); }

        function closeReader() { 
            isAutoScrolling=false; cancelAnimationFrame(scrollFrame); 
            document.getElementById('section-reader').style.display='none'; 
            document.getElementById('section-library').style.display='flex'; 
            document.getElementById('mini-page-num').classList.add('hidden');
            renderLib(); 
        }

        function captureFull() {
            const n = document.getElementById('page-inp').value; const holder = document.getElementById(`pg-${n}`); if(!holder) return;
            const pc = holder.querySelector('.pdf-canvas'), dc = holder.querySelector('.draw-layer');
            const f = document.createElement('canvas'); f.width=pc.width; f.height=pc.height; const c = f.getContext('2d');
            if(isNight) c.filter='invert(1) hue-rotate(180deg)'; c.drawImage(pc,0,0); c.filter='none';
            c.globalCompositeOperation = isNight?'screen':'multiply'; c.drawImage(dc,0,0);
            const a = document.createElement('a'); a.download=`page_${n}.png`; a.href=f.toDataURL(); a.click(); showToast("تم الحفظ");
        }
        function startCrop() { isCrop = !isCrop; document.getElementById('btn-crop').classList.toggle('text-blue-400'); if(isCrop) document.body.classList.add('crop-active'); else document.body.classList.remove('crop-active'); }
        function startC(e) { startPos={x:e.clientX, y:e.clientY, s:document.getElementById('reader-scroll').scrollTop}; document.getElementById('selection-rect').style.display='block'; isPainting=true; }
        function moveC(e) {
            const r = document.getElementById('selection-rect'), root = document.getElementById('reader-scroll');
            if(e.clientY > window.innerHeight-50) root.scrollTop += 15;
            const diff = root.scrollTop - startPos.s; const w = e.clientX - startPos.x; const h = (e.clientY - startPos.y) + diff;
            r.style.left = (w>0?startPos.x:e.clientX)+'px'; r.style.top = (h>0?startPos.y:e.clientY)+'px'; r.style.width = Math.abs(w)+'px'; r.style.height = Math.abs(h)+'px';
        }
        async function endC() { document.getElementById('selection-rect').style.display='none'; isCrop=false; document.getElementById('btn-crop').classList.remove('text-blue-400'); document.body.classList.remove('crop-active'); showToast("تم الحفظ"); }

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
    </script>
</body>
</html>