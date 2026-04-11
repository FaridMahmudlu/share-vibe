import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Camera, Upload, Heart, X, Sparkles, MapPin, Clock, Instagram, Twitter, Facebook, Video, PlayCircle, Share2, Copy, Check, Trash2, Palette, RefreshCw, RotateCw, Sun, Contrast, ChevronLeft, ChevronRight, Coffee, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, storage } from './firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, serverTimestamp, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import AdminPanel from './AdminPanel';

type MediaType = 'image' | 'video';

type MediaItem = {
  id: string;
  url: string;
  type: MediaType;
  caption: string;
  likesCount: number;
  likedBy: string[];
  rotation: number;
  date: string;
  tableNumber: string;
  authorUid: string;
  createdAt: any;
};

const AnimatedBackground = () => (
  <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/30 blur-[100px] animate-blob" />
    <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-400/30 blur-[120px] animate-blob animation-delay-2000" />
    <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-blue-400/30 blur-[150px] animate-blob animation-delay-4000" />
  </div>
);

const THEME_COLORS = [
  { name: 'Pembe', value: '#ec4899' },
  { name: 'Mor', value: '#a855f7' },
  { name: 'Mavi', value: '#3b82f6' },
  { name: 'Yeşil', value: '#10b981' },
  { name: 'Turuncu', value: '#f97316' },
];

const THEME_FONTS = [
  { name: 'Caveat', value: '"Caveat", cursive' },
  { name: 'Dancing Script', value: '"Dancing Script", cursive' },
  { name: 'Pacifico', value: '"Pacifico", cursive' },
  { name: 'Indie Flower', value: '"Indie Flower", cursive' },
];

const CAMERA_FILTERS = [
  { name: 'Normal', value: 'none' },
  { name: 'Siyah Beyaz', value: 'grayscale(100%)' },
  { name: 'Sepya', value: 'sepia(100%)' },
  { name: 'Canlı', value: 'saturate(200%)' },
  { name: 'Soğuk', value: 'hue-rotate(180deg)' },
  { name: 'Nostalji', value: 'contrast(150%) sepia(50%)' },
  { name: 'Bulanık', value: 'blur(4px)' },
  { name: 'Negatif', value: 'invert(100%)' },
  { name: 'Siberpunk', value: 'hue-rotate(270deg) saturate(300%) contrast(150%)' },
  { name: 'Gün Batımı', value: 'sepia(30%) saturate(150%) hue-rotate(-30deg)' },
  { name: 'Sinematik', value: 'saturate(120%) contrast(110%) hue-rotate(15deg) brightness(90%)' },
  { name: 'Dramatik', value: 'contrast(200%) grayscale(20%)' },
  { name: 'Soluk Film', value: 'contrast(80%) brightness(120%) saturate(80%)' },
  { name: 'Pop Art', value: 'saturate(400%) contrast(150%)' },
];

export default function App() {
  const [currentView, setCurrentView] = useState<'app' | 'admin'>('app');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [accentColor, setAccentColor] = useState('#ec4899');
  const [handwritingFont, setHandwritingFont] = useState('"Caveat", cursive');
  const [cafeName, setCafeName] = useState('Lumina Konsept Kafe');
  const [campaignTarget, setCampaignTarget] = useState(5);
  const [campaignReward, setCampaignReward] = useState('ücretsiz bir kahve');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [activeFilter, setActiveFilter] = useState<string>('none');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<MediaType>('image');
  const [caption, setCaption] = useState('');
  const [currentTable, setCurrentTable] = useState('Masa 12');
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [shareMediaId, setShareMediaId] = useState<string | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [showRewardModal, setShowRewardModal] = useState(false);
  
  // Image editing state
  const [editRotation, setEditRotation] = useState(0);
  const [editBrightness, setEditBrightness] = useState(100);
  const [editContrast, setEditContrast] = useState(100);

  // Calculate weekly uploads for the current user
  const userUploadsThisWeekCount = useMemo(() => {
    if (!currentUserUid) return 0;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return mediaItems.filter(item => {
      if (item.authorUid !== currentUserUid) return false;
      if (!item.createdAt) return true; // If just uploaded and timestamp is pending, count it
      const itemDate = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
      return itemDate > oneWeekAgo;
    }).length;
  }, [mediaItems, currentUserUid]);

  // Calculate total uploads for rewards
  const totalUserUploadsCount = useMemo(() => {
    if (!currentUserUid) return 0;
    return mediaItems.filter(item => item.authorUid === currentUserUid).length;
  }, [mediaItems, currentUserUid]);

  const isDeletable = (item: MediaItem) => {
    if (!item.createdAt) return true;
    const itemDate = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - itemDate.getTime()) / (1000 * 60);
    return diffMinutes <= 30;
  };

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const filterScrollRef = useRef<HTMLDivElement>(null);

  const scrollFilters = (direction: 'left' | 'right') => {
    if (filterScrollRef.current) {
      const scrollAmount = filterScrollRef.current.clientWidth / 2;
      filterScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', accentColor);
    localStorage.setItem('theme_accent', accentColor);
  }, [accentColor]);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-handwriting', handwritingFont);
    localStorage.setItem('theme_font', handwritingFont);
  }, [handwritingFont]);

  useEffect(() => {
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.accentColor) setAccentColor(data.accentColor);
        if (data.handwritingFont) setHandwritingFont(data.handwritingFont);
        if (data.cafeName) setCafeName(data.cafeName);
        if (data.campaignTarget) setCampaignTarget(data.campaignTarget);
        if (data.campaignReward) setCampaignReward(data.campaignReward);
      }
    });

    return () => unsubscribeSettings();
  }, []);

  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOpen]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserUid(user.uid);
        setIsAnonymous(user.isAnonymous);
      } else {
        setCurrentUserUid(null);
        setIsAnonymous(true);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'media'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: MediaItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          url: data.url,
          type: data.type,
          caption: data.caption,
          likesCount: data.likesCount || 0,
          likedBy: data.likedBy || [],
          rotation: data.rotation,
          date: data.date,
          tableNumber: data.tableNumber,
          authorUid: data.authorUid,
          createdAt: data.createdAt
        });
      });
      setMediaItems(items);
    }, (error) => {
      console.error("Error fetching media:", error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const masaParam = params.get('masa');
    if (masaParam) {
      setCurrentTable(`Masa ${masaParam}`);
    }
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileNameLower = file.name.toLowerCase();
      const isVideo = file.type.startsWith('video/') || !!fileNameLower.match(/\.(mp4|mov|webm|avi|mkv)$/i);
      setUploadType(isVideo ? 'video' : 'image');
      
      const isHeic = !isVideo && (fileNameLower.endsWith('.heic') || fileNameLower.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif');

      if (isHeic) {
        setUploadStatus("Fotoğraf formatı dönüştürülüyor...");
        try {
          const heic2any = (await import('heic2any')).default;
          const convertedBlob = await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.8
          });
          
          const convertedFile = new File(
            [Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob], 
            file.name.replace(/\.(heic|heif)$/i, '.jpg'), 
            { type: 'image/jpeg' }
          );
          setSelectedFile(convertedFile);
          setPreviewUrl(URL.createObjectURL(convertedFile));
        } catch (error) {
          console.error("HEIC conversion error:", error);
          setUploadError("Fotoğraf formatı dönüştürülemedi. Lütfen farklı bir fotoğraf seçin.");
        } finally {
          setUploadStatus(null);
        }
      } else {
        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    }
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    let uid = currentUserUid;

    if (!uid || isAnonymous) {
      try {
        setUploadStatus("Google ile giriş yapılıyor...");
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        uid = result.user.uid;
        setCurrentUserUid(uid);
        setIsAnonymous(false);
      } catch (error) {
        console.error("Giriş hatası:", error);
        setUploadError("Paylaşım yapmak için Google ile giriş yapmalısınız.");
        setUploadStatus(null);
        return;
      }
    }

    // Check weekly limit (2 per week)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const userUploadsThisWeek = mediaItems.filter(item => {
      if (item.authorUid !== uid) return false;
      if (!item.createdAt) return true; // If just uploaded and timestamp is pending, count it
      const itemDate = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
      return itemDate > oneWeekAgo;
    });

    if (userUploadsThisWeek.length >= 2) {
      setUploadError("Haftalık paylaşım limitinize (2) ulaştınız. Lütfen daha sonra tekrar deneyin.");
      return;
    }

    setIsSaving(true);
    setUploadError(null);
    setUploadProgress(0);
    setUploadStatus("Medya hafızaya yükleniyor...");
    try {
      let fileToUpload = selectedFile;
      
      // Apply edits if it's an image and edits were made
      if (uploadType === 'image' && previewUrl && (editRotation !== 0 || editBrightness !== 100 || editContrast !== 100)) {
        setUploadStatus("Fotoğraf işleniyor...");
        const img = new Image();
        img.src = previewUrl;
        await new Promise((resolve, reject) => { 
          img.onload = resolve; 
          img.onerror = reject;
        });
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          if (editRotation % 180 === 90 || editRotation % 180 === -90) {
            canvas.width = img.height;
            canvas.height = img.width;
          } else {
            canvas.width = img.width;
            canvas.height = img.height;
          }
          
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((editRotation * Math.PI) / 180);
          ctx.filter = `brightness(${editBrightness}%) contrast(${editContrast}%)`;
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
          if (blob) {
            fileToUpload = new File([blob], selectedFile.name, { type: 'image/jpeg' });
          }
        }
      }

      // Upload to Firebase Storage
      const fileExtension = fileToUpload.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
      const storageRef = ref(storage, `media/${fileName}`);
      
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
            setUploadStatus(`Yükleniyor... %${Math.round(progress)}`);
          },
          (error) => {
            reject(error);
          },
          () => {
            resolve();
          }
        );
      });
      
      setUploadStatus("Bağlantı alınıyor...");
      const downloadUrl = await getDownloadURL(storageRef);

      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      setUploadStatus("Veritabanına kaydediliyor...");
      // Save to Firestore
      await addDoc(collection(db, 'media'), {
        url: downloadUrl,
        type: uploadType,
        caption: caption || 'İsimsiz anı ✨',
        likedBy: [],
        likesCount: 0,
        rotation: Math.random() * 6 - 3,
        date: timeString,
        tableNumber: currentTable,
        authorUid: uid,
        createdAt: serverTimestamp()
      });

      setUploadStatus(null);
      setUploadProgress(null);
      setIsUploadModalOpen(false);
      setPreviewUrl(null);
      setSelectedFile(null);
      setCaption('');

      // Check if this is the target upload
      if (totalUserUploadsCount + 1 === campaignTarget) {
        setShowRewardModal(true);
      }
    } catch (error: any) {
      console.error("Error uploading media:", error);
      setUploadError(error.message || "Yükleme sırasında bir hata oluştu.");
      setUploadStatus(null);
      setUploadProgress(null);
    } finally {
      setIsSaving(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOpen(true);
      setFacingMode(mode);
    } catch (err) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCameraOpen(true);
      } catch (fallbackErr) {
        console.error("Kamera erişim hatası:", fallbackErr);
        setUploadError("Kameraya erişilemedi. Lütfen izinleri kontrol edin.");
      }
    }
  };

  const toggleCamera = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(newMode);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.filter = activeFilter;
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setUploadType('image');
            stopCamera();
            setActiveFilter('none');
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const cancelUpload = () => {
    setIsUploadModalOpen(false);
    setPreviewUrl(null);
    setSelectedFile(null);
    setCaption('');
    setUploadError(null);
    setUploadStatus(null);
    setUploadProgress(null);
    setEditRotation(0);
    setEditBrightness(100);
    setEditContrast(100);
    stopCamera();
  };

  const toggleLike = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    let uid = currentUserUid;
    if (!uid || isAnonymous) {
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        uid = result.user.uid;
        setCurrentUserUid(uid);
        setIsAnonymous(false);
      } catch (error) {
        console.error("Giriş hatası:", error);
        return;
      }
    }

    const item = mediaItems.find(m => m.id === id);
    if (!item) return;

    const isLiked = item.likedBy.includes(uid);
    const docRef = doc(db, 'media', id);

    try {
      if (isLiked) {
        await updateDoc(docRef, {
          likedBy: arrayRemove(uid),
          likesCount: item.likesCount - 1
        });
      } else {
        await updateDoc(docRef, {
          likedBy: arrayUnion(uid),
          likesCount: item.likesCount + 1
        });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMediaToDelete(id);
  };

  const confirmDelete = async () => {
    if (!mediaToDelete) return;
    const id = mediaToDelete;
    setMediaToDelete(null);

    try {
      const item = mediaItems.find(m => m.id === id);
      if (item && item.url) {
        try {
          // Extract file path from download URL
          const urlObj = new URL(item.url);
          const path = decodeURIComponent(urlObj.pathname.split('/o/')[1].split('?')[0]);
          const fileRef = ref(storage, path);
          await deleteObject(fileRef);
        } catch (storageError) {
          console.error("Error deleting file from storage:", storageError);
          // Continue to delete the document even if storage deletion fails
        }
      }

      await deleteDoc(doc(db, 'media', id));
      if (selectedMediaId === id) {
        setSelectedMediaId(null);
      }
    } catch (error) {
      console.error("Error deleting media:", error);
      setUploadError("Silme işlemi başarısız oldu.");
    }
  };

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}?media=${id}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const shareToInstagramStory = async (mediaId: string) => {
    const item = mediaItems.find(m => m.id === mediaId);
    if (!item) return;

    try {
      let file: File | null = null;
      try {
        // Fetch the image to create a blob
        const response = await fetch(item.url);
        const blob = await response.blob();
        file = new File([blob], 'story.jpg', { type: 'image/jpeg' });
      } catch (fetchError) {
        console.warn("Could not fetch image for sharing (CORS issue), falling back to URL share.", fetchError);
      }

      if (navigator.canShare) {
        const shareData: ShareData = {
          title: 'Anı',
          text: item.caption || 'Bu harika anıya göz at!',
          url: `${window.location.origin}?media=${mediaId}`
        };

        if (file && navigator.canShare({ files: [file] })) {
          shareData.files = [file];
        }

        await navigator.share(shareData);
      } else {
        // Fallback if Web Share API is not supported
        alert("Cihazınız doğrudan paylaşımı desteklemiyor. Bağlantıyı kopyalayabilirsiniz.");
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Error sharing to Instagram:", error);
      }
    }
  };

  const selectedMedia = selectedMediaId ? mediaItems.find(m => m.id === selectedMediaId) : null;

  if (currentView === 'admin') {
    return <AdminPanel onBack={() => setCurrentView('app')} />;
  }

  return (
    <div className="min-h-screen pb-24 font-sans selection:bg-accent/30 relative">
      <AnimatedBackground />
      
      {/* Header / Navbar */}
      <header className="sticky top-0 z-30 bg-cafe-900/80 backdrop-blur-xl border-b border-cafe-800/80 py-4 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo / Title */}
          <div className="flex flex-col">
            <span className="text-[10px] sm:text-xs font-bold text-accent tracking-[0.2em] uppercase mb-1 opacity-80">
              {cafeName}
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-light tracking-wide text-cafe-50 leading-none">
              Galeri
            </h1>
          </div>

          {/* Social Icons & Theme */}
          <div className="flex items-center gap-4 sm:gap-5">
            <button 
              onClick={() => setCurrentView('admin')} 
              className="text-cafe-100/50 hover:text-accent transition-colors" 
              aria-label="Admin Paneli"
            >
              <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button 
              onClick={() => setIsThemeModalOpen(true)} 
              className="text-cafe-100/50 hover:text-accent transition-colors" 
              aria-label="Tema Ayarları"
            >
              <Palette className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <a href="#" className="text-cafe-100/50 hover:text-accent transition-colors" aria-label="Instagram">
              <Instagram className="w-5 h-5 sm:w-6 sm:h-6" />
            </a>
            <a href="#" className="text-cafe-100/50 hover:text-accent transition-colors" aria-label="Twitter">
              <Twitter className="w-5 h-5 sm:w-6 sm:h-6" />
            </a>
            <a href="#" className="text-cafe-100/50 hover:text-accent transition-colors" aria-label="Facebook">
              <Facebook className="w-5 h-5 sm:w-6 sm:h-6" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        {/* Responsive Masonry Gallery */}
        <div className="masonry-grid">
          <AnimatePresence>
            {mediaItems.map((item, index) => (
              <motion.div
                key={item.id}
                layout="position"
                initial={{ opacity: 0, y: 40, scale: 0.8, rotate: item.rotation }}
                animate={{ opacity: 1, y: 0, scale: 1, rotate: item.rotation }}
                exit={{ opacity: 0, scale: 0.5, filter: "blur(4px)", transition: { duration: 0.25 } }}
                transition={{ duration: 0.4, type: "spring", stiffness: 150 }}
                className="masonry-item relative group"
              >
                <motion.div
                  animate={currentUserUid && item.likedBy.includes(currentUserUid) ? { y: [0, -6, 0], scale: [1, 1.02, 1] } : { y: 0, scale: 1 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                  {/* Gallery Frame */}
                  <div className="bg-cafe-800 p-2 sm:p-3 rounded-xl shadow-xl border border-cafe-700 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] relative group/card overflow-hidden">
                  
                  {/* Media Container */}
                  <div 
                    className="relative aspect-square sm:aspect-[4/5] overflow-hidden rounded-lg bg-cafe-900 shadow-inner group/media cursor-pointer"
                    onClick={() => setSelectedMediaId(item.id)}
                  >
                    {item.type === 'video' ? (
                      <>
                        <video
                          src={item.url}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/media:scale-105"
                          autoPlay
                          muted
                          loop
                          playsInline
                        />
                        <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm rounded-full p-1.5 z-10 transition-transform group-hover/media:scale-110">
                          <PlayCircle className="w-4 h-4 text-white/90" />
                        </div>
                      </>
                    ) : (
                      <img
                        src={item.url}
                        alt={item.caption}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover/media:scale-105"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    
                    {/* Hover Overlay for Click Indication */}
                    <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover/media:opacity-100 transform translate-y-4 group-hover/media:translate-y-0 transition-all duration-300 bg-black/60 backdrop-blur-md text-white px-5 py-2.5 rounded-full text-xs tracking-[0.15em] uppercase font-medium border border-white/20">
                        Yakından Bak
                      </div>
                    </div>
                  </div>
                  
                  {/* Caption Area */}
                  <div className="pt-3 sm:pt-4 pb-2 text-center px-1 sm:px-2">
                    <p className="font-handwriting text-cafe-50 text-xl sm:text-3xl leading-tight opacity-90">
                      {item.caption}
                    </p>
                  </div>

                  {/* Metadata Footer */}
                  <div className="mt-2 pt-3 border-t border-cafe-700 flex items-center justify-between px-1">
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] sm:text-sm font-medium text-cafe-100 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-accent" /> {item.tableNumber}
                      </span>
                      <span className="text-[8px] sm:text-xs text-cafe-100/50 flex items-center gap-1 mt-0.5">
                        <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {item.date}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      {currentUserUid === item.authorUid && isDeletable(item) && (
                        <button
                          onClick={(e) => handleDelete(item.id, e)}
                          className="flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 w-6 h-6 sm:w-9 sm:h-9 rounded-full transition-colors active:scale-95"
                          aria-label="Sil"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setShareMediaId(item.id); }}
                        className="flex items-center justify-center bg-cafe-700 hover:bg-cafe-600 w-6 h-6 sm:w-9 sm:h-9 rounded-full transition-colors active:scale-95"
                        aria-label="Paylaş"
                      >
                        <Share2 className="w-3 h-3 sm:w-4 sm:h-4 text-cafe-100/70" />
                      </button>
                      <button
                        onClick={(e) => toggleLike(item.id, e)}
                        className="flex items-center gap-1 sm:gap-1.5 bg-cafe-700 hover:bg-cafe-600 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full transition-colors active:scale-95"
                      >
                        <motion.div
                          animate={currentUserUid && item.likedBy.includes(currentUserUid) ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Heart
                            className={`w-3 h-3 sm:w-5 sm:h-5 transition-colors ${
                              currentUserUid && item.likedBy.includes(currentUserUid) ? 'fill-accent text-accent' : 'text-cafe-100/70'
                            }`}
                          />
                        </motion.div>
                        <span className={`text-[10px] sm:text-sm font-bold ${currentUserUid && item.likedBy.includes(currentUserUid) ? 'text-accent' : 'text-cafe-100/70'}`}>
                          {item.likesCount}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Action Button for Upload */}
      <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">
        {currentUserUid && !isAnonymous && (
          <div className="bg-cafe-900/80 backdrop-blur-md text-cafe-50 text-xs px-3 py-1.5 rounded-full shadow-lg border border-cafe-700/50 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${userUploadsThisWeekCount >= 2 ? 'bg-red-500' : 'bg-accent animate-pulse'}`} />
            <span className="font-medium">Haftalık Limit: {userUploadsThisWeekCount} / 2</span>
          </div>
        )}
        <input
          type="file"
          accept="image/*,video/*"
          capture="environment"
          ref={cameraInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="group relative flex items-center gap-3 bg-accent hover:brightness-110 text-cafe-900 px-6 sm:px-8 py-4 rounded-full shadow-2xl shadow-accent/20 transition-all hover:-translate-y-1 active:translate-y-0 font-bold tracking-[0.1em] uppercase text-sm sm:text-base border border-cafe-900/10"
        >
          <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-20 group-hover:opacity-0" />
          <div className="flex items-center gap-1.5">
            <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-cafe-900/30 text-lg font-light">|</span>
            <Video className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="whitespace-nowrap">Anı Ekle</span>
        </button>
      </div>

      {/* Lightbox Modal for Viewing Media Closely */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-xl"
            onClick={() => setSelectedMediaId(null)}
          >
            <button 
              className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white/70 hover:text-white z-[70] bg-black/40 p-2 rounded-full backdrop-blur-md transition-colors"
              onClick={() => setSelectedMediaId(null)}
            >
              <X className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative max-w-5xl w-full max-h-[90vh] flex flex-col md:flex-row bg-cafe-900 rounded-2xl overflow-hidden shadow-2xl border border-cafe-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Media Section */}
              <div className="flex-1 bg-black relative min-h-[45vh] md:min-h-[60vh] overflow-hidden">
                {selectedMedia.type === 'video' ? (
                  <video 
                    src={selectedMedia.url} 
                    className="absolute inset-0 w-full h-full object-contain"
                    controls
                    autoPlay
                    playsInline
                  />
                ) : (
                  <img 
                    src={selectedMedia.url} 
                    alt={selectedMedia.caption}
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                )}
              </div>
              
              {/* Info Section */}
              <div className="w-full md:w-80 bg-cafe-800 p-5 sm:p-6 flex flex-col shrink-0 overflow-y-auto max-h-[45vh] md:max-h-none">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-cafe-700">
                  <div className="w-12 h-12 rounded-full bg-cafe-700 flex items-center justify-center text-accent font-bold text-lg shadow-inner">
                    {selectedMedia.tableNumber.replace('Masa ', '').substring(0, 3)}
                  </div>
                  <div>
                    <p className="font-semibold text-cafe-50 text-lg">{selectedMedia.tableNumber}</p>
                    <p className="text-sm text-cafe-100/50 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {selectedMedia.date}
                    </p>
                  </div>
                </div>
                
                <p className="font-handwriting text-3xl sm:text-4xl text-cafe-50 flex-1 py-4 leading-tight">
                  {selectedMedia.caption}
                </p>
                
                <div className="mt-4 pt-4 border-t border-cafe-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleLike(selectedMedia.id)}
                      className={`flex items-center gap-2 px-5 py-3 rounded-full transition-all active:scale-95 ${
                        currentUserUid && selectedMedia.likedBy.includes(currentUserUid) ? 'bg-accent/20 text-accent' : 'bg-cafe-700 hover:bg-cafe-600 text-cafe-50'
                      }`}
                    >
                      <motion.div
                        animate={currentUserUid && selectedMedia.likedBy.includes(currentUserUid) ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Heart
                          className={`w-6 h-6 transition-colors ${
                            currentUserUid && selectedMedia.likedBy.includes(currentUserUid) ? 'fill-accent text-accent' : 'text-cafe-100/70'
                          }`}
                        />
                      </motion.div>
                      <span className="font-bold text-lg">
                        {selectedMedia.likesCount} Beğeni
                      </span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentUserUid === selectedMedia.authorUid && isDeletable(selectedMedia) && (
                      <button
                        onClick={() => handleDelete(selectedMedia.id)}
                        className="flex items-center justify-center bg-red-500/20 hover:bg-red-500/30 text-red-400 w-12 h-12 rounded-full transition-colors active:scale-95"
                        aria-label="Sil"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => setShareMediaId(selectedMedia.id)}
                      className="flex items-center justify-center bg-cafe-700 hover:bg-cafe-600 text-cafe-50 w-12 h-12 rounded-full transition-colors active:scale-95"
                      aria-label="Paylaş"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal - Fixed Layout */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cafe-900/95 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-cafe-800 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-cafe-700"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-cafe-700 flex justify-between items-center bg-cafe-800/50 shrink-0">
                <h3 className="text-lg font-semibold text-cafe-50 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  Yeni Anı
                </h3>
                <button
                  onClick={cancelUpload}
                  className="p-2 text-cafe-100/50 hover:text-cafe-50 transition-colors rounded-full hover:bg-cafe-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {!previewUrl && !isCameraOpen ? (
                <div className="p-6 sm:p-8 flex flex-col gap-4">
                  <button
                    onClick={startCamera}
                    className="flex items-center justify-center gap-3 w-full py-4 bg-cafe-700 hover:bg-cafe-600 text-cafe-50 rounded-xl transition-colors shadow-lg"
                  >
                    <Camera className="w-6 h-6 text-accent" />
                    <span className="font-medium text-lg">Kamera ile Çek</span>
                  </button>
                </div>
              ) : isCameraOpen ? (
                <div className="p-4 sm:p-5 flex flex-col items-center gap-4">
                  <div className="relative w-full rounded-xl overflow-hidden bg-black aspect-[3/4] sm:aspect-video flex items-center justify-center shadow-inner border border-cafe-700">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ 
                        filter: activeFilter,
                        transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
                      }}
                    />
                    <button
                      onClick={toggleCamera}
                      className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                      title="Kamerayı Çevir"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* Filters Carousel */}
                  <div className="relative w-full group/carousel">
                    {/* Left Scroll Button */}
                    <button 
                      onClick={() => scrollFilters('left')}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-r-xl backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity disabled:opacity-0 hidden sm:block"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div 
                      ref={filterScrollRef}
                      className="w-full overflow-x-auto pb-4 pt-4 scrollbar-hide snap-x flex gap-3 sm:gap-4 px-4 sm:px-8 scroll-smooth"
                    >
                      {CAMERA_FILTERS.map(filter => (
                        <button
                          key={filter.name}
                          onClick={() => setActiveFilter(filter.value)}
                          className="flex flex-col items-center gap-2 snap-center group outline-none shrink-0"
                        >
                          <div 
                            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden transition-all duration-300 shadow-lg relative ${
                              activeFilter === filter.value 
                                ? 'ring-4 ring-accent ring-offset-2 ring-offset-cafe-900 scale-110' 
                                : 'opacity-70 group-hover:opacity-100 group-hover:scale-105 border-2 border-cafe-700'
                            }`}
                          >
                            <div 
                              className="absolute inset-0 bg-gradient-to-tr from-pink-500 via-purple-500 to-blue-500"
                              style={{ filter: filter.value }}
                            />
                            {/* Inner ring for professional look */}
                            <div className="absolute inset-0 rounded-full border border-white/20" />
                          </div>
                          <span className={`text-[10px] sm:text-xs font-medium transition-colors ${
                            activeFilter === filter.value ? 'text-accent font-bold' : 'text-cafe-100/70 group-hover:text-cafe-100'
                          }`}>
                            {filter.name}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Right Scroll Button */}
                    <button 
                      onClick={() => scrollFilters('right')}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-l-xl backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity disabled:opacity-0 hidden sm:block"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex gap-3 w-full">
                    <button
                      onClick={stopCamera}
                      className="flex-1 px-4 py-3 rounded-xl font-medium text-cafe-100 hover:bg-cafe-700 transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      onClick={capturePhoto}
                      className="flex-1 px-4 py-3 rounded-xl font-medium bg-accent hover:brightness-110 text-cafe-900 shadow-lg shadow-accent/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <Camera className="w-5 h-5" />
                      Kamera ile Çek
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Modal Body (Scrollable) */}
                  <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-5">
                {/* Media Preview Container */}
                <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden bg-cafe-900 border border-cafe-700 shadow-inner shrink-0 flex items-center justify-center">
                  {uploadType === 'video' ? (
                    <video
                      src={previewUrl}
                      className="w-full h-full object-contain"
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-contain transition-all"
                      style={{
                        transform: `rotate(${editRotation}deg)`,
                        filter: `brightness(${editBrightness}%) contrast(${editContrast}%)`
                      }}
                    />
                  )}
                </div>

                {uploadType === 'image' && (
                  <div className="space-y-4 shrink-0 bg-cafe-800/50 p-4 rounded-xl border border-cafe-700">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-cafe-100/70">
                        <RotateCw className="w-4 h-4" />
                        <span className="text-sm font-medium">Döndür</span>
                      </div>
                      <button
                        onClick={() => setEditRotation(prev => (prev + 90) % 360)}
                        className="px-3 py-1.5 bg-cafe-700 hover:bg-cafe-600 rounded-lg text-sm font-medium transition-colors"
                      >
                        90° Çevir
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-cafe-100/70">
                        <div className="flex items-center gap-2">
                          <Sun className="w-4 h-4" />
                          <span className="text-sm font-medium">Parlaklık</span>
                        </div>
                        <span className="text-xs">{editBrightness}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={editBrightness}
                        onChange={(e) => setEditBrightness(Number(e.target.value))}
                        className="w-full accent-accent"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-cafe-100/70">
                        <div className="flex items-center gap-2">
                          <Contrast className="w-4 h-4" />
                          <span className="text-sm font-medium">Kontrast</span>
                        </div>
                        <span className="text-xs">{editContrast}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={editContrast}
                        onChange={(e) => setEditContrast(Number(e.target.value))}
                        className="w-full accent-accent"
                      />
                    </div>
                  </div>
                )}
                
                <div className="space-y-4 shrink-0">
                  <div className="space-y-2">
                    <label htmlFor="tableSelect" className="block text-sm font-medium text-cafe-100/70">
                      Hangi Masadasınız?
                    </label>
                    <select
                      id="tableSelect"
                      value={currentTable}
                      onChange={(e) => setCurrentTable(e.target.value)}
                      className="w-full bg-cafe-900 border border-cafe-700 rounded-xl px-4 py-3 text-cafe-50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all appearance-none"
                    >
                      {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={`Masa ${num}`}>Masa {num}</option>
                      ))}
                      <option value="Bar">Bar</option>
                      <option value="Bahçe">Bahçe</option>
                      <option value="Teras">Teras</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="caption" className="block text-sm font-medium text-cafe-100/70">
                      {uploadType === 'video' ? 'Videoya' : 'Fotoğrafa'} bir not düş (İsteğe bağlı)
                    </label>
                    <input
                      id="caption"
                      type="text"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Örn: Harika bir akşamdı..."
                      className="w-full bg-cafe-900 border border-cafe-700 rounded-xl px-4 py-3 text-cafe-50 placeholder:text-cafe-100/30 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all font-handwriting text-2xl"
                      maxLength={40}
                    />
                  </div>
                </div>
              </div>

              {uploadError && (
                <div className="px-4 py-3 mx-4 mt-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                  {uploadError}
                </div>
              )}

              {uploadStatus && !uploadError && (
                <div className="px-4 py-3 mx-4 mt-2 bg-accent/10 border border-accent/20 rounded-xl text-accent text-sm text-center font-medium flex flex-col gap-2">
                  <span>{uploadStatus}</span>
                  {uploadProgress !== null && (
                    <div className="w-full bg-cafe-900/50 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-accent h-full transition-all duration-300 ease-out" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Modal Footer */}
              <div className="p-4 border-t border-cafe-700 bg-cafe-800/50 flex gap-3 shrink-0 mt-4">
                <button
                  onClick={cancelUpload}
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 rounded-xl font-medium text-cafe-100 hover:bg-cafe-700 transition-colors disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 rounded-xl font-medium bg-accent hover:brightness-110 text-cafe-900 shadow-lg shadow-accent/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-cafe-900/30 border-t-cafe-900 rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Paylaş
                    </>
                  )}
                </button>
              </div>
            </>
            )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {mediaToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-cafe-900/80 backdrop-blur-sm"
            onClick={() => setMediaToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-cafe-800 rounded-2xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl border border-cafe-700 p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-cafe-50 mb-2">Anıyı Sil</h3>
              <p className="text-cafe-100/70 mb-6">Bu anıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setMediaToDelete(null)}
                  className="flex-1 px-4 py-3 rounded-xl font-medium text-cafe-100 hover:bg-cafe-700 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-3 rounded-xl font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
                >
                  Evet, Sil
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {shareMediaId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-cafe-900/80 backdrop-blur-sm"
            onClick={() => setShareMediaId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-cafe-800 rounded-2xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl border border-cafe-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-cafe-700 flex justify-between items-center bg-cafe-800/50">
                <h3 className="text-lg font-semibold text-cafe-50 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-accent" />
                  Paylaş
                </h3>
                <button
                  onClick={() => setShareMediaId(null)}
                  className="p-2 text-cafe-100/50 hover:text-cafe-50 transition-colors rounded-full hover:bg-cafe-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-5">
                <div className="flex justify-center gap-6">
                  {/* WhatsApp */}
                  <a href={`https://wa.me/?text=${encodeURIComponent('Bu harika anıya göz at! ' + window.location.origin + '?media=' + shareMediaId)}`} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </a>
                  {/* Twitter */}
                  <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.origin + '?media=' + shareMediaId)}&text=${encodeURIComponent('Bu harika anıya göz at!')}`} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-[#1DA1F2] flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg">
                    <Twitter className="w-6 h-6 fill-current" />
                  </a>
                  {/* Facebook */}
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + '?media=' + shareMediaId)}`} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-[#4267B2] flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg">
                    <Facebook className="w-6 h-6 fill-current" />
                  </a>
                  {/* Instagram Story */}
                  <button 
                    onClick={() => shareToInstagramStory(shareMediaId)}
                    className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg"
                    title="Instagram Hikayesinde Paylaş"
                  >
                    <Instagram className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="relative mt-2">
                  <label className="block text-xs font-medium text-cafe-100/70 mb-1.5">Bağlantıyı Kopyala</label>
                  <div className="flex items-center bg-cafe-900 border border-cafe-700 rounded-xl overflow-hidden">
                    <input 
                      type="text" 
                      readOnly 
                      value={`${window.location.origin}?media=${shareMediaId}`}
                      className="flex-1 bg-transparent px-3 py-3 text-sm text-cafe-100/70 outline-none"
                    />
                    <button 
                      onClick={() => handleCopyLink(shareMediaId)}
                      className="px-4 py-3 bg-cafe-700 hover:bg-cafe-600 text-cafe-50 transition-colors flex items-center gap-2 font-medium text-sm border-l border-cafe-600"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      {isCopied ? 'Kopyalandı' : 'Kopyala'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Theme Modal */}
      <AnimatePresence>
        {isThemeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsThemeModalOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-cafe-900 border border-cafe-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 sm:p-6 border-b border-cafe-800 flex justify-between items-center bg-cafe-800/30">
                <h2 className="text-xl font-bold text-cafe-50 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-accent" />
                  Tema Ayarları
                </h2>
                <button
                  onClick={() => setIsThemeModalOpen(false)}
                  className="p-2 text-cafe-100/50 hover:text-cafe-50 hover:bg-cafe-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-6">
                {/* Accent Color Selection */}
                <div>
                  <h3 className="text-sm font-medium text-cafe-100/70 mb-3">Vurgu Rengi</h3>
                  <div className="flex flex-wrap gap-3">
                    {THEME_COLORS.map(color => (
                      <button
                        key={color.value}
                        onClick={() => setAccentColor(color.value)}
                        className={`w-10 h-10 rounded-full border-2 transition-all ${accentColor === color.value ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                        aria-label={color.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Font Selection */}
                <div>
                  <h3 className="text-sm font-medium text-cafe-100/70 mb-3">El Yazısı Fontu</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {THEME_FONTS.map(font => (
                      <button
                        key={font.value}
                        onClick={() => setHandwritingFont(font.value)}
                        className={`p-3 rounded-xl border transition-all text-lg ${handwritingFont === font.value ? 'border-accent bg-accent/10 text-accent' : 'border-cafe-700 bg-cafe-800 text-cafe-50 hover:border-cafe-600'}`}
                        style={{ fontFamily: font.value }}
                      >
                        {font.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Reward Modal */}
      <AnimatePresence>
        {showRewardModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-cafe-900/90 backdrop-blur-md"
            onClick={() => setShowRewardModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50, rotate: -5 }}
              animate={{ scale: 1, y: 0, rotate: 0 }}
              exit={{ scale: 0.8, y: 50, rotate: 5 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="bg-gradient-to-br from-accent to-orange-400 p-1 rounded-3xl w-full max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-cafe-900 rounded-[22px] p-8 text-center relative overflow-hidden">
                {/* Confetti / Sparkles effect */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-30">
                  <div className="absolute top-4 left-4 animate-pulse"><Sparkles className="w-6 h-6 text-accent" /></div>
                  <div className="absolute bottom-8 right-8 animate-pulse delay-150"><Sparkles className="w-8 h-8 text-accent" /></div>
                  <div className="absolute top-1/2 right-4 animate-pulse delay-300"><Sparkles className="w-5 h-5 text-accent" /></div>
                </div>

                <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Coffee className="w-10 h-10 text-accent" />
                </div>
                
                <h2 className="text-3xl font-bold text-cafe-50 mb-2 font-handwriting">Tebrikler! 🎉</h2>
                <p className="text-cafe-100/80 mb-6">
                  {campaignTarget}. fotoğrafınızı paylaştınız ve bizden <strong className="text-accent">{campaignReward}</strong> kazandınız!
                </p>
                
                <div className="bg-cafe-800 rounded-xl p-4 mb-6 border border-cafe-700 border-dashed">
                  <p className="text-xs text-cafe-100/50 mb-1 uppercase tracking-wider">Ödül Kodunuz</p>
                  <p className="text-2xl font-mono font-bold text-accent tracking-widest">KAFE-5X</p>
                </div>

                <button
                  onClick={() => setShowRewardModal(false)}
                  className="w-full py-4 bg-accent hover:brightness-110 text-cafe-900 font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-accent/20"
                >
                  Harika, Teşekkürler!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
