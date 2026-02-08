import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ArrowLeft, Image as ImageIcon, Dumbbell, Calendar, LayoutGrid, HardDrive, Settings, AlertTriangle, Check, Palette, Search, Activity, List, Edit3, PlayCircle, Upload, Film, X } from 'lucide-react';

// --- إعدادات قاعدة البيانات (IndexedDB) لحفظ الفيديوهات والصور الكبيرة ---
const DB_NAME = 'GymTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'media';

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const saveMediaToDB = async (file) => {
  try {
    const db = await initDB();
    const id = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const item = { id, file, type: file.type, date: Date.now() };
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(item);
      request.onsuccess = () => resolve(id);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("Error saving media:", err);
    throw err;
  }
};

const getMediaFromDB = async (id) => {
  if (!id) return null;
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result ? request.result.file : null);
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.error("Error retrieving media:", err);
    return null;
  }
};

const deleteMediaFromDB = async (id) => {
  if (!id) return;
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("Error deleting media:", err);
  }
};

// --- مكون عرض الوسائط (صورة أو فيديو) ---
const MediaThumbnail = ({ mediaId, legacyImage, alt, className }) => {
  const [src, setSrc] = useState(legacyImage || null);
  const [type, setType] = useState(legacyImage ? 'image' : null);
  const [loading, setLoading] = useState(!legacyImage && !!mediaId);

  useEffect(() => {
    let isActive = true;
    let objectUrl = null;

    const loadMedia = async () => {
      if (mediaId) {
        setLoading(true);
        const file = await getMediaFromDB(mediaId);
        if (isActive && file) {
          objectUrl = URL.createObjectURL(file);
          setSrc(objectUrl);
          setType(file.type.startsWith('video') ? 'video' : 'image');
          setLoading(false);
        } else if (isActive) {
          setLoading(false);
        }
      }
    };

    if (mediaId && !src) {
        loadMedia();
    } else if (!mediaId && legacyImage) {
        // Handle legacy base64 images
        setSrc(legacyImage);
        setType('image');
        setLoading(false);
    }

    return () => {
      isActive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mediaId, legacyImage]);

  if (loading) return (
      <div className={`animate-pulse bg-zinc-800 flex items-center justify-center ${className}`}>
          <Activity className="w-6 h-6 text-zinc-600 animate-spin" />
      </div>
  );

  if (type === 'video') {
    return (
      <div className={`relative ${className} bg-black flex items-center justify-center overflow-hidden`}>
        <video 
            src={src} 
            className="w-full h-full object-cover pointer-events-none" 
            muted 
            playsInline 
            autoPlay 
            loop 
        />
        <div className="absolute inset-0 bg-black/10"></div>
      </div>
    );
  }

  if (src) {
    return <img src={src} alt={alt} className={`${className} object-cover`} loading="lazy" />;
  }

  return (
    <div className={`${className} flex flex-col items-center justify-center bg-zinc-800/50 opacity-50`}>
       <Dumbbell className="w-8 h-8 mb-2 opacity-50" />
    </div>
  );
};

// --- التطبيق الرئيسي ---

const THEMES = {
  classic: { id: 'classic', name: 'البرتقالي الكلاسيكي', bg: 'bg-[#09090b]', surface: 'bg-zinc-900', accent: 'text-orange-500', accentBg: 'bg-orange-600', accentHover: 'hover:bg-orange-500', accentLight: 'bg-orange-500/10', border: 'border-white/5', gradient: 'from-orange-400 to-orange-600' },
  ocean: { id: 'ocean', name: 'أزرق المحيط', bg: 'bg-[#020617]', surface: 'bg-slate-900', accent: 'text-cyan-400', accentBg: 'bg-cyan-600', accentHover: 'hover:bg-cyan-500', accentLight: 'bg-cyan-500/10', border: 'border-cyan-500/10', gradient: 'from-cyan-400 to-blue-600' },
  emerald: { id: 'emerald', name: 'الأخضر الزمردي', bg: 'bg-[#022c22]', surface: 'bg-[#064e3b]', accent: 'text-emerald-400', accentBg: 'bg-emerald-600', accentHover: 'hover:bg-emerald-500', accentLight: 'bg-emerald-500/10', border: 'border-emerald-500/10', gradient: 'from-emerald-400 to-green-600' },
  royal: { id: 'royal', name: 'البنفسجي الملكي', bg: 'bg-[#0f0728]', surface: 'bg-[#1e1045]', accent: 'text-purple-400', accentBg: 'bg-purple-600', accentHover: 'hover:bg-purple-500', accentLight: 'bg-purple-500/10', border: 'border-purple-500/10', gradient: 'from-purple-400 to-indigo-600' },
  lava: { id: 'lava', name: 'الحمم الحمراء', bg: 'bg-[#0c0000]', surface: 'bg-[#210000]', accent: 'text-red-500', accentBg: 'bg-red-600', accentHover: 'hover:bg-red-500', accentLight: 'bg-red-500/10', border: 'border-red-500/10', gradient: 'from-red-400 to-red-700' }
};

const AppLogo = ({ theme }) => (
  <div className="relative flex items-center justify-center w-10 h-10">
    <div className={`absolute inset-0 ${theme.accentLight} blur-lg rounded-full animate-pulse`}></div>
    <svg viewBox="0 0 24 24" className={`w-8 h-8 ${theme.accent} relative z-10`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 15h12M6 9h12M18 6v12M6 6v12M3 12h3M18 12h3" />
    </svg>
  </div>
);

export default function App() {
  const [days, setDays] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [isAddingDay, setIsAddingDay] = useState(false);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [viewMedia, setViewMedia] = useState(null); 
  const [currentTheme, setCurrentTheme] = useState(THEMES.classic);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, id: null, title: '' });
  
  const [newDayTitle, setNewDayTitle] = useState('');
  const [newExerciseName, setNewExerciseName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null); 
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedDays = localStorage.getItem('gym_days');
    const savedExercises = localStorage.getItem('gym_exercises');
    const savedTheme = localStorage.getItem('gym_theme');
    
    if (savedDays) try { setDays(JSON.parse(savedDays)); } catch (e) {}
    if (savedExercises) try { setExercises(JSON.parse(savedExercises)); } catch (e) {}
    if (savedTheme && THEMES[savedTheme]) setCurrentTheme(THEMES[savedTheme]);
    
    initDB().catch(console.error);
  }, []);

  useEffect(() => {
    localStorage.setItem('gym_days', JSON.stringify(days));
  }, [days]);

  useEffect(() => {
    localStorage.setItem('gym_exercises', JSON.stringify(exercises));
  }, [exercises]);

  useEffect(() => {
    if (!isAddingExercise) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setPreviewType(null);
      setSelectedFile(null);
      setNewExerciseName('');
      if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
    }
  }, [isAddingExercise]);

  const changeTheme = (themeKey) => {
    setCurrentTheme(THEMES[themeKey]);
    localStorage.setItem('gym_theme', themeKey);
    setIsSettingsOpen(false);
  };

  const handleAddDay = () => {
    if (!newDayTitle.trim()) return;
    const newDay = { id: Date.now().toString(), title: newDayTitle, createdAt: Date.now() };
    setDays([...days, newDay]);
    setNewDayTitle('');
    setIsAddingDay(false);
  };

  const executeDelete = async () => {
    if (deleteConfirm.type === 'day') {
      const dayExercises = exercises.filter(ex => ex.dayId === deleteConfirm.id);
      for (const ex of dayExercises) {
        if (ex.mediaId) await deleteMediaFromDB(ex.mediaId);
      }
      setDays(prev => prev.filter(d => d.id !== deleteConfirm.id));
      setExercises(prev => prev.filter(ex => ex.dayId !== deleteConfirm.id));
      if (selectedDay?.id === deleteConfirm.id) setSelectedDay(null);
    } else if (deleteConfirm.type === 'exercise') {
      const exercise = exercises.find(ex => ex.id === deleteConfirm.id);
      if (exercise?.mediaId) {
        await deleteMediaFromDB(exercise.mediaId);
      }
      setExercises(prev => prev.filter(ex => ex.id !== deleteConfirm.id));
    }
    setDeleteConfirm({ isOpen: false, type: null, id: null, title: '' });
  };

  const handleAddExercise = async () => {
    if (!newExerciseName.trim() || !selectedDay) return;
    setIsSaving(true);

    try {
      let mediaId = null;
      let mediaType = null;

      if (selectedFile) {
        mediaId = await saveMediaToDB(selectedFile);
        mediaType = selectedFile.type.startsWith('video') ? 'video' : 'image';
      }

      const newEx = {
        id: Date.now().toString(),
        name: newExerciseName,
        mediaId: mediaId, 
        mediaType: mediaType,
        dayId: selectedDay.id,
        createdAt: Date.now()
      };

      setExercises(prev => [...prev, newEx]);
      setIsAddingExercise(false);
    } catch (error) {
      console.error("Failed to save media:", error);
      alert("حدث خطأ أثناء حفظ الملف. قد تكون المساحة ممتلئة أو الملف كبير جداً.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setPreviewType(file.type.startsWith('video') ? 'video' : 'image');
      setSelectedFile(file);
    }
  };

  const filteredExercises = exercises.filter(ex => ex.dayId === selectedDay?.id);

  return (
    <div className={`min-h-screen ${currentTheme.bg} text-zinc-100 font-sans pb-10 transition-colors duration-500`} dir="rtl">
      {/* Header */}
      <header className={`${currentTheme.surface}/80 backdrop-blur-xl border-b ${currentTheme.border} p-4 sticky top-0 z-40 shadow-sm`}>
        <div className="max-w-md mx-auto flex items-center justify-between">
          {selectedDay ? (
            <button onClick={() => setSelectedDay(null)} className="p-2 hover:bg-white/5 rounded-2xl transition-all active:scale-90">
              <ArrowLeft className="w-6 h-6" />
            </button>
          ) : (
            <AppLogo theme={currentTheme} />
          )}
          
          <div className="flex flex-col items-center">
            <h1 className={`text-lg font-black tracking-tight bg-gradient-to-l ${currentTheme.gradient} bg-clip-text text-transparent`}>
              {selectedDay ? selectedDay.title : "نادي الأبطال"}
            </h1>
          </div>

          <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-zinc-500 hover:text-white transition-colors">
            <Palette className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-5 pb-24">
        {!selectedDay ? (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-white text-xl font-bold">جدولك الأسبوعي</h2>
                <p className="text-zinc-500 text-xs mt-1">لديك {days.length} أيام مسجلة</p>
              </div>
              <button 
                onClick={() => setIsAddingDay(true)}
                className={`${currentTheme.accentBg} ${currentTheme.accentHover} text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-90`}
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>

            {days.length === 0 && !isAddingDay && (
              <div className={`text-center py-24 ${currentTheme.surface}/30 rounded-[2.5rem] border ${currentTheme.border}`}>
                <div className={`${currentTheme.surface}/50 rounded-full flex items-center justify-center mx-auto mb-6 w-20 h-20`}>
                  <Dumbbell className={`w-10 h-10 text-zinc-600`} />
                </div>
                <p className="text-zinc-400 font-medium text-lg">لا يوجد أيام حالياً</p>
                <button onClick={() => setIsAddingDay(true)} className={`${currentTheme.accent} text-sm mt-2 font-bold hover:underline`}>اضغط لإضافة يوم جديد</button>
              </div>
            )}

            <div className="grid gap-4">
              {days.map((day) => (
                <div 
                  key={day.id}
                  onClick={() => setSelectedDay(day)}
                  className={`relative overflow-hidden ${currentTheme.surface} border ${currentTheme.border} p-6 rounded-[2rem] flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-all shadow-xl shadow-black/20`}
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 ${currentTheme.accentLight} rounded-[1.2rem] flex items-center justify-center ${currentTheme.accent} group-hover:${currentTheme.accentBg} group-hover:text-white transition-all duration-300`}>
                      <Calendar className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-white group-hover:translate-x-[-4px] transition-transform">{day.title}</h3>
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-tighter">
                        {exercises.filter(ex => ex.dayId === day.id).length} تمارين محفوظة
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ isOpen: true, type: 'day', id: day.id, title: day.title }); }}
                    className="relative z-10 p-3 text-zinc-700 hover:text-red-500 transition-colors active:scale-125"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-white text-xl font-black">التمارين</h2>
                <p className="text-zinc-500 text-xs uppercase tracking-widest mt-1">تمارين {selectedDay.title}</p>
              </div>
              <button 
                onClick={() => setIsAddingExercise(true)}
                className="bg-white text-black px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-black shadow-xl transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" /> تمرين جديد
              </button>
            </div>

            <div className="flex flex-col gap-5">
              
              {filteredExercises.map((ex) => (
                <div 
                  key={ex.id} 
                  className={`${currentTheme.surface} rounded-[1.8rem] overflow-hidden border ${currentTheme.border} relative group shadow-2xl cursor-pointer hover:border-white/10 transition-colors`}
                  onClick={() => {
                    if (ex.mediaType === 'video' || ex.mediaId || ex.image) {
                        setViewMedia(ex);
                    }
                  }}
                >
                  <div className="aspect-video bg-zinc-800/20 flex items-center justify-center overflow-hidden relative">
                    <MediaThumbnail mediaId={ex.mediaId} legacyImage={ex.image} alt={ex.name} className="w-full h-full" />
                  </div>
                  <div className={`p-4 ${currentTheme.surface}/90 backdrop-blur-sm border-t ${currentTheme.border}`}>
                    <h4 className="font-bold text-lg text-white truncate text-center">{ex.name}</h4>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ isOpen: true, type: 'exercise', id: ex.id, title: ex.name }); }}
                    className="absolute top-3 left-3 p-2 bg-black/40 backdrop-blur-xl rounded-xl text-white opacity-0 group-hover:opacity-100 transition-all border border-white/10 active:scale-125 z-10 hover:bg-red-500/80"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {filteredExercises.length === 0 && (
                  <div className="py-20 text-center text-zinc-500 flex flex-col items-center animate-in zoom-in duration-300">
                      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                        <Dumbbell className="w-10 h-10 opacity-40" />
                      </div>
                      <p className="text-lg font-bold text-zinc-400">لا توجد تمارين بعد</p>
                      <p className="text-xs opacity-50 mt-2 max-w-[200px] leading-relaxed">اضغط على زر "تمرين جديد" في الأعلى لإضافة أول تمرين</p>
                  </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Full Screen Media Modal */}
      {viewMedia && (
        <div className="fixed inset-0 bg-black/95 z-[70] flex flex-col justify-center items-center p-4 animate-in fade-in duration-200">
           <button 
            onClick={() => setViewMedia(null)} 
            className="absolute top-6 left-6 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 z-50 backdrop-blur-md"
           >
            <X className="w-6 h-6" />
           </button>
           
           <h2 className="absolute top-8 text-xl font-bold text-white z-40 drop-shadow-md px-4 py-2 bg-black/50 rounded-xl backdrop-blur-sm">{viewMedia.name}</h2>
           
           <div className="w-full max-w-5xl aspect-video rounded-3xl overflow-hidden shadow-2xl bg-black border border-white/10 relative">
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                 <MediaViewerFull mediaId={viewMedia.mediaId} legacyImage={viewMedia.image} />
              </div>
           </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[60] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className={`${currentTheme.surface} w-full max-w-sm rounded-[2.5rem] p-8 border ${currentTheme.border} shadow-2xl`}>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-white">اختر المظهر</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-zinc-500 hover:text-white">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <div className="grid gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {Object.keys(THEMES).map((key) => {
                const theme = THEMES[key];
                const isActive = currentTheme.id === theme.id;
                return (
                  <button 
                    key={key}
                    onClick={() => changeTheme(key)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isActive ? `border-${theme.accent.split('-')[1]}-500 ${theme.accentLight}` : 'border-white/5 bg-white/5'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full ${theme.accentBg}`}></div>
                      <span className={`font-bold ${isActive ? 'text-white' : 'text-zinc-400'}`}>{theme.name}</span>
                    </div>
                    {isActive && <Check className={`w-5 h-5 ${theme.accent}`} />}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setIsSettingsOpen(false)} className={`w-full mt-8 p-4 rounded-2xl bg-zinc-800 text-zinc-400 font-bold active:scale-95 transition-all`}>إغلاق</button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className={`${currentTheme.surface} w-full max-w-xs rounded-[2.5rem] p-8 border border-red-500/20 shadow-2xl text-center`}>
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-black mb-2 text-white">حذف نهائي؟</h2>
            <p className="text-zinc-500 text-sm mb-8 leading-relaxed">سيتم حذف <span className="text-white font-bold">"{deleteConfirm.title}"</span> تماماً.</p>
            <div className="flex flex-col gap-3">
              <button onClick={executeDelete} className="w-full bg-red-600 text-white p-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all">تأكيد الحذف</button>
              <button onClick={() => setDeleteConfirm({ isOpen: false, type: null, id: null, title: '' })} className="w-full bg-zinc-800 text-zinc-400 p-4 rounded-2xl font-bold active:scale-95 transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Day Modal */}
      {isAddingDay && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className={`${currentTheme.surface} w-full max-w-sm rounded-[2.5rem] p-8 border ${currentTheme.border} shadow-2xl`}>
            <div className={`w-16 h-16 ${currentTheme.accentBg} rounded-[1.5rem] flex items-center justify-center mb-6 mx-auto shadow-lg`}>
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black text-center mb-6">تسمية اليوم</h2>
            <input 
              autoFocus
              type="text"
              placeholder="مثلاً: يوم الصدر"
              className={`w-full ${currentTheme.bg} border ${currentTheme.border} rounded-2xl p-5 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-${currentTheme.accent.split('-')[1]}-500 mb-6 text-center font-bold`}
              value={newDayTitle}
              onChange={(e) => setNewDayTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddDay()}
            />
            <div className="flex gap-4">
              <button onClick={handleAddDay} className={`flex-[2] ${currentTheme.accentBg} text-white p-5 rounded-2xl font-black shadow-lg active:scale-95 transition-all`}>تأكيد</button>
              <button onClick={() => setIsAddingDay(false)} className="flex-1 bg-zinc-800 text-zinc-400 p-5 rounded-2xl font-bold active:scale-95 transition-all text-xs">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Exercise Modal with Video Support */}
      {isAddingExercise && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-in zoom-in duration-300">
          <div className={`${currentTheme.surface} w-full max-w-sm rounded-[2.5rem] border ${currentTheme.border} shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar`}>
            
            <div className="p-6 pb-2 text-center border-b border-white/5 sticky top-0 bg-inherit z-10">
                <h2 className="text-xl font-black text-white">إضافة تمرين جديد</h2>
                <p className="text-zinc-500 text-xs mt-1">أضف صورة أو فيديو توضيحي</p>
            </div>

            <div className="p-6">
                <div className="mb-6">
                    <label className={`flex flex-col items-center justify-center w-full aspect-video border-2 ${currentTheme.border} border-dashed rounded-[1.5rem] cursor-pointer hover:bg-white/5 transition-all relative overflow-hidden bg-zinc-900/50 group`}>
                    {previewUrl ? (
                        <>
                            {previewType === 'video' ? (
                                <video src={previewUrl} className="w-full h-full object-cover opacity-80" autoPlay muted loop playsInline />
                            ) : (
                                <img src={previewUrl} className="w-full h-full object-cover opacity-80" alt="Preview" />
                            )}
                            
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs font-bold text-white flex items-center gap-2"><Edit3 className="w-4 h-4"/> تغيير الملف</span>
                            </div>
                            {previewType === 'video' && (
                                <div className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-lg backdrop-blur-md">
                                    <Film className="w-4 h-4 text-white" />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center p-4">
                            <div className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                                <Upload className={`w-6 h-6 ${currentTheme.accent}`} />
                            </div>
                            <p className="text-sm text-zinc-300 font-bold mb-1">صورة أو فيديو</p>
                            <p className="text-[10px] text-zinc-500">اضغط لرفع ملف</p>
                        </div>
                    )}
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        className="hidden" 
                        accept="image/*,video/*" 
                        onChange={handleFileSelect} 
                    />
                    </label>
                </div>

                <div className="space-y-4">
                    <input 
                    type="text"
                    placeholder="اسم التمرين (مثلاً: بنش برس)"
                    className={`w-full ${currentTheme.bg} border ${currentTheme.border} rounded-2xl p-5 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-${currentTheme.accent.split('-')[1]}-500 font-bold text-center`}
                    value={newExerciseName}
                    onChange={(e) => setNewExerciseName(e.target.value)}
                    />
                    
                    <button 
                        onClick={handleAddExercise} 
                        disabled={!newExerciseName.trim() || isSaving}
                        className={`w-full ${currentTheme.accentBg} text-white p-5 rounded-2xl font-black shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                    >
                        {isSaving ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>جاري الحفظ...</span>
                            </>
                        ) : "حفظ التمرين"}
                    </button>
                </div>
            </div>

            <div className="p-4 border-t border-white/5 bg-zinc-900/50 rounded-b-[2.5rem]">
              <button onClick={() => setIsAddingExercise(false)} className="w-full py-3 bg-zinc-800 text-zinc-400 rounded-xl font-bold active:scale-95 transition-all text-xs">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MediaViewerFull = ({ mediaId, legacyImage }) => {
    const [src, setSrc] = useState(legacyImage || null);
    const [type, setType] = useState(legacyImage ? 'image' : null);

    useEffect(() => {
        let isActive = true;
        let objectUrl = null;

        if (mediaId) {
            getMediaFromDB(mediaId).then((file) => {
                if (isActive && file) {
                    objectUrl = URL.createObjectURL(file);
                    setSrc(objectUrl);
                    setType(file.type.startsWith('video') ? 'video' : 'image');
                }
            });
        }
        return () => {
            isActive = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [mediaId]);

    if (!src) return <div className="text-white flex items-center gap-2"><Activity className="animate-spin w-5 h-5"/> جاري التحميل...</div>;

    if (type === 'video') {
        return <video src={src} controls autoPlay loop playsInline className="w-full h-full object-contain" />;
    }
    return <img src={src} className="w-full h-full object-contain" alt="Full view" />;
};