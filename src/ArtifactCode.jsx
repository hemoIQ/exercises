import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Activity, AlertCircle, CheckCircle, X, Image as ImageIcon } from 'lucide-react';

export default function App() {
  const [image, setImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  // حالات الكاميرا
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // إيقاف الكاميرا عند إغلاق التطبيق أو تبديل الوضع
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // يفضل الكاميرا الخلفية في الهواتف
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
      setImage(null);
      setResult(null);
    } catch (err) {
      setError('تعذر الوصول إلى الكاميرا. يرجى التأكد من منح الصلاحيات.');
      console.error(err);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // تحويل الصورة إلى Base64
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setImage(imageDataUrl);
      stopCamera();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
        setResult(null);
        setError(null);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;
    
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      // إعداد الطلب للخادم المحلي (LM Studio أو مشابه)
      // ملاحظة: يجب تفعيل CORS في إعدادات الخادم المحلي الخاص بك
      const response = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "local-model", // يمكنك تركه هكذا، الخوادم المحلية غالباً تتجاهل الاسم وتستخدم الموديل المحمل
          messages: [
            {
              role: "user",
              content: [
                { 
                  type: "text", 
                  text: "أنت خبير تغذية ذكي. قم بتحليل هذه الصورة بدقة. تعرف على نوع الطعام الموجود فيها، وقدم تقديراً مفصلاً للسعرات الحرارية، والبروتينات، والكربوهيدرات، والدهون. يرجى تقديم الإجابة باللغة العربية بتنسيق واضح ومنظم." 
                },
                { 
                  type: "image_url", 
                  image_url: { 
                    url: image 
                  } 
                }
              ]
            }
          ],
          temperature: 0.5,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`خطأ في الاتصال بالخادم: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        setResult(data.choices[0].message.content);
      } else {
        throw new Error('لم يتم استلام رد صالح من الذكاء الاصطناعي.');
      }

    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء الاتصال بالذكاء الاصطناعي المحلي. تأكد من أن الخادم يعمل على http://127.0.0.1:1234 وأن خاصية CORS مفعلة وأن الموديل يدعم الرؤية (Vision).');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearAll = () => {
    setImage(null);
    setResult(null);
    setError(null);
    stopCamera();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans" dir="rtl">
      {/* Header */}
      <header className="bg-emerald-600 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-center gap-3">
          <Activity size={32} className="text-emerald-200" />
          <h1 className="text-2xl font-bold tracking-wide">محلل السعرات الحرارية الذكي</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        
        {/* تعليمات سريعة */}
        {!image && !isCameraActive && (
          <div className="text-center mb-10">
            <h2 className="text-xl text-gray-600 mb-6">التقط صورة لطعامك أو قم برفعها لمعرفة قيمتها الغذائية باستخدام الذكاء الاصطناعي!</h2>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button 
                onClick={startCamera}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl shadow-lg transition-all transform hover:scale-105"
              >
                <Camera size={24} />
                <span className="text-lg font-semibold">فتح الكاميرا</span>
              </button>
              
              <label className="flex items-center justify-center gap-2 bg-white border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 px-8 py-4 rounded-xl shadow-lg cursor-pointer transition-all transform hover:scale-105">
                <Upload size={24} />
                <span className="text-lg font-semibold">رفع صورة</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
            </div>
          </div>
        )}

        {/* واجهة الكاميرا */}
        {isCameraActive && (
          <div className="bg-black rounded-2xl overflow-hidden shadow-2xl relative max-w-2xl mx-auto">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-auto object-cover max-h-[60vh]"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center gap-4">
              <button 
                onClick={capturePhoto}
                className="bg-emerald-500 hover:bg-emerald-400 text-white rounded-full w-16 h-16 flex items-center justify-center border-4 border-white shadow-lg transition-transform hover:scale-110"
              >
                <Camera size={28} />
              </button>
              <button 
                onClick={stopCamera}
                className="bg-red-500 hover:bg-red-400 text-white rounded-full w-16 h-16 flex items-center justify-center border-4 border-transparent shadow-lg"
              >
                <X size={28} />
              </button>
            </div>
          </div>
        )}

        {/* عرض الصورة الملتقطة أو المرفوعة */}
        {image && !isCameraActive && (
          <div className="bg-white rounded-2xl p-4 shadow-xl max-w-2xl mx-auto animate-fade-in">
            <div className="relative rounded-xl overflow-hidden mb-4 group">
              <img 
                src={image} 
                alt="الطعام المراد تحليله" 
                className="w-full h-auto max-h-[50vh] object-contain bg-gray-100"
              />
              <button 
                onClick={clearAll}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
                <AlertCircle className="shrink-0 mt-0.5" size={20} />
                <p className="text-sm leading-relaxed">{error}</p>
              </div>
            )}

            {!result && (
              <button
                onClick={analyzeImage}
                disabled={isAnalyzing}
                className={`w-full py-4 rounded-xl text-lg font-bold text-white shadow-md flex items-center justify-center gap-3 transition-all ${
                  isAnalyzing 
                    ? 'bg-emerald-400 cursor-not-allowed' 
                    : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg transform hover:-translate-y-1'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري التحليل واستخراج البيانات...
                  </>
                ) : (
                  <>
                    <Activity size={24} />
                    تحليل القيم الغذائية
                  </>
                )}
              </button>
            )}

            {/* عرض النتيجة */}
            {result && (
              <div className="mt-6 border-t border-gray-100 pt-6 animate-fade-in-up">
                <div className="flex items-center gap-2 mb-4 text-emerald-600">
                  <CheckCircle size={24} />
                  <h3 className="text-xl font-bold">النتيجة والتحليل:</h3>
                </div>
                <div className="bg-emerald-50/50 p-6 rounded-xl border border-emerald-100 text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {result}
                </div>
                <button
                  onClick={clearAll}
                  className="mt-4 w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
                >
                  تحليل وجبة أخرى
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
        .animate-fade-in-up { animation: fade-in-up 0.5s ease-out; }
      `}} />
    </div>
  );
}