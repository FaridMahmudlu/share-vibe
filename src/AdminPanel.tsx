import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { Settings, Save, ArrowLeft, Image as ImageIcon, Palette, Type, Gift, Coffee } from 'lucide-react';
import { motion } from 'motion/react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';

const THEME_COLORS = [
  { name: 'Pembe', value: '#ec4899' },
  { name: 'Mor', value: '#8b5cf6' },
  { name: 'Mavi', value: '#3b82f6' },
  { name: 'Yeşil', value: '#10b981' },
  { name: 'Turuncu', value: '#f97316' },
];

const THEME_FONTS = [
  { name: 'Zarif', value: '"Caveat", cursive' },
  { name: 'Klasik', value: '"Dancing Script", cursive' },
  { name: 'Modern', value: '"Pacifico", cursive' },
  { name: 'Doğal', value: '"Indie Flower", cursive' },
];

export default function AdminPanel({ onBack }: { onBack: () => void }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [settings, setSettings] = useState({
    cafeName: 'Lumina Konsept Kafe',
    accentColor: '#ec4899',
    handwritingFont: '"Caveat", cursive',
    campaignTarget: 5,
    campaignReward: 'ücretsiz bir kahve'
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user && !user.isAnonymous) {
        setUserEmail(user.email);
        // Check admin status by trying to read settings or checking email
        if (user.email === 'fariddmahmudlu2008@gmail.com') {
          setIsAdmin(true);
        } else {
          // Check if they have admin role in users collection
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') {
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
            }
          } catch (e) {
            setIsAdmin(false);
          }
        }
      } else {
        setIsAdmin(false);
        setUserEmail(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
        if (doc.exists()) {
          setSettings(prev => ({ ...prev, ...doc.data() }));
        }
      });
      return () => unsubscribeSettings();
    }
  }, [isAdmin]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), settings);
      alert("Ayarlar başarıyla kaydedildi!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Ayarlar kaydedilirken bir hata oluştu.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-cafe-900 flex items-center justify-center text-cafe-50">Yükleniyor...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-cafe-900 flex flex-col items-center justify-center text-cafe-50 p-4">
        <div className="bg-cafe-800 p-8 rounded-2xl max-w-md w-full text-center border border-cafe-700 shadow-2xl">
          <Settings className="w-16 h-16 text-accent mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-2">Admin Paneli</h1>
          <p className="text-cafe-100/70 mb-8">Bu alana sadece yetkili kafe yöneticileri erişebilir.</p>
          
          {userEmail ? (
            <div className="space-y-4">
              <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">
                {userEmail} hesabının yetkisi yok.
              </p>
              <button 
                onClick={handleLogout}
                className="w-full py-3 bg-cafe-700 hover:bg-cafe-600 rounded-xl transition-colors font-medium"
              >
                Farklı Hesapla Giriş Yap
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="w-full py-3 bg-accent hover:brightness-110 text-cafe-900 rounded-xl transition-colors font-bold shadow-lg shadow-accent/20"
            >
              Google ile Giriş Yap
            </button>
          )}
          
          <button 
            onClick={onBack}
            className="mt-6 text-cafe-100/50 hover:text-cafe-100 text-sm transition-colors"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cafe-900 text-cafe-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-cafe-900/80 backdrop-blur-md border-b border-cafe-800 px-4 py-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-cafe-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-accent" />
            Admin Paneli
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-cafe-100/50 hidden sm:inline">{userEmail}</span>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-accent hover:brightness-110 text-cafe-900 px-4 py-2 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-8 mt-4">
        {/* Genel Ayarlar */}
        <section className="bg-cafe-800 rounded-2xl p-6 border border-cafe-700 shadow-xl">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-cafe-700 pb-4">
            <Type className="w-5 h-5 text-accent" />
            Genel Ayarlar
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-cafe-100/70 mb-2">Kafe Adı</label>
              <input 
                type="text"
                value={settings.cafeName}
                onChange={(e) => setSettings({...settings, cafeName: e.target.value})}
                className="w-full bg-cafe-900 border border-cafe-700 rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>
        </section>

        {/* Görünüm Ayarları */}
        <section className="bg-cafe-800 rounded-2xl p-6 border border-cafe-700 shadow-xl">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-cafe-700 pb-4">
            <Palette className="w-5 h-5 text-accent" />
            Görünüm Ayarları
          </h2>
          
          <div className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-cafe-100/70 mb-4">Ana Tema Rengi</label>
              <div className="flex flex-wrap gap-4">
                {THEME_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setSettings({...settings, accentColor: color.value})}
                    className={`w-12 h-12 rounded-full transition-all ${settings.accentColor === color.value ? 'ring-4 ring-offset-4 ring-offset-cafe-800 scale-110' : 'hover:scale-110'}`}
                    style={{ backgroundColor: color.value, ringColor: color.value }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-cafe-100/70 mb-4">El Yazısı Fontu</label>
              <div className="grid grid-cols-2 gap-4">
                {THEME_FONTS.map(font => (
                  <button
                    key={font.value}
                    onClick={() => setSettings({...settings, handwritingFont: font.value})}
                    className={`p-4 rounded-xl border transition-all text-xl ${settings.handwritingFont === font.value ? 'border-accent bg-accent/10 text-accent' : 'border-cafe-700 bg-cafe-900 hover:border-cafe-600'}`}
                    style={{ fontFamily: font.value }}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Kampanya Ayarları */}
        <section className="bg-cafe-800 rounded-2xl p-6 border border-cafe-700 shadow-xl">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-cafe-700 pb-4">
            <Gift className="w-5 h-5 text-accent" />
            Kampanya ve Ödüller
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-cafe-100/70 mb-2">Hedef Fotoğraf Sayısı</label>
              <p className="text-xs text-cafe-100/50 mb-3">Kullanıcının ödül kazanmak için paylaşması gereken fotoğraf sayısı.</p>
              <input 
                type="number"
                min="1"
                value={settings.campaignTarget}
                onChange={(e) => setSettings({...settings, campaignTarget: parseInt(e.target.value) || 1})}
                className="w-full sm:w-32 bg-cafe-900 border border-cafe-700 rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-cafe-100/70 mb-2">Kazanılacak Ödül</label>
              <p className="text-xs text-cafe-100/50 mb-3">Hedefe ulaşıldığında gösterilecek ödül metni.</p>
              <input 
                type="text"
                value={settings.campaignReward}
                onChange={(e) => setSettings({...settings, campaignReward: e.target.value})}
                placeholder="Örn: ücretsiz bir kahve"
                className="w-full bg-cafe-900 border border-cafe-700 rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            <div className="bg-cafe-900 p-6 rounded-xl border border-cafe-700 mt-4">
              <h3 className="text-sm font-medium text-cafe-100/70 mb-4">Önizleme:</h3>
              <div className="text-center">
                <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Coffee className="w-8 h-8 text-accent" />
                </div>
                <h4 className="text-2xl font-bold text-cafe-50 mb-2 font-handwriting" style={{ fontFamily: settings.handwritingFont }}>Tebrikler! 🎉</h4>
                <p className="text-cafe-100/80">
                  {settings.campaignTarget}. fotoğrafınızı paylaştınız ve bizden <strong className="text-accent" style={{ color: settings.accentColor }}>{settings.campaignReward}</strong> kazandınız!
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
