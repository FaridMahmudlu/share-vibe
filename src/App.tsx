import React, { Suspense, startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Upload, Heart, X, Sparkles, MapPin, Clock, Instagram, Twitter, Facebook, Share2, Copy, Check, Trash2, RotateCw, Sun, Contrast, Coffee, Settings, ImageOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, storage, waitForAuthInitialization } from './firebase';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { getGoogleSignInErrorMessage, resolveGoogleSignInRedirect, signInWithGoogle } from './googleAuth';
import { deleteMediaRecord } from './mediaStorage';
import { clearPendingUpload, getPendingUpload, savePendingUpload, type PendingUploadDraft } from './pendingUpload';
import MainPage from './MainPage';
import { hasOwnerPortalAccess } from './accessConfig';
import {
  buildCafePublicLink,
  DEFAULT_CAFE_SLUG,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_CAFE_NAME,
  DEFAULT_CAMPAIGN_REWARD,
  DEFAULT_CAMPAIGN_TARGET,
  DEFAULT_DEMO_TABLE,
  DEFAULT_HANDWRITING_FONT,
  DEFAULT_MEDIA_CAPTION,
  normalizeCafeSlug,
  normalizeHandwritingFont,
  normalizeLegacyText,
  normalizeTableLabel,
} from './uiConfig';

type MediaType = 'image';

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
  cafeSlug: string;
  authorUid: string;
  createdAt: any;
};

type UploadDraft = PendingUploadDraft;
type RewardPreviewItem = Pick<MediaItem, 'id' | 'url' | 'caption'>;
type RewardCelebration = {
  items: RewardPreviewItem[];
  target: number;
} | null;

const AnimatedBackground = () => (
  <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/30 blur-[100px] animate-blob" />
    <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-400/30 blur-[120px] animate-blob animation-delay-2000" />
    <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-blue-400/30 blur-[150px] animate-blob animation-delay-4000" />
  </div>
);

const BrokenMediaPlaceholder = ({
  message,
  compact = false,
}: {
  message: string;
  compact?: boolean;
}) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-cafe-800 to-cafe-700 text-cafe-100/70 px-6 text-center">
    <ImageOff className={compact ? 'w-8 h-8 text-cafe-100/40' : 'w-12 h-12 text-cafe-100/40'} />
    <p className={compact ? 'text-xs font-medium' : 'text-sm font-medium'}>{message}</p>
  </div>
);

const MAX_WEEKLY_UPLOADS = 2;
const MAX_UPLOAD_IMAGE_DIMENSION = 4096;
const MAX_UPLOAD_IMAGE_SIZE = 8_000_000;
const AdminPanel = React.lazy(() => import('./AdminPanel'));
const OWNER_PORTAL_INTENT_KEY = 'share-vibe-owner-portal-intent';

const getMediaDate = (value: MediaItem['createdAt']) => {
  if (!value) {
    return null;
  }

  if (typeof value?.toDate === 'function') {
    return value.toDate();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getCampaignProgressCount = (totalUploads: number, campaignTarget: number) => {
  if (campaignTarget <= 0 || totalUploads <= 0) {
    return 0;
  }

  const remainder = totalUploads % campaignTarget;
  return remainder === 0 ? campaignTarget : remainder;
};

const getInitialQueryParams = () => {
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.search);
};

const getInitialCafeSlug = () =>
  normalizeCafeSlug(
    getInitialQueryParams().get('cafe') ?? getInitialQueryParams().get('kafe') ?? DEFAULT_CAFE_SLUG
  );

const getInitialTableLabel = () =>
  normalizeTableLabel(
    getInitialQueryParams().get('table') ?? getInitialQueryParams().get('masa'),
    ''
  );

const getInitialView = (): 'landing' | 'app' | 'admin' | 'owner' => {
  const params = getInitialQueryParams();
  const requestedScreen = params.get('screen');

  if (requestedScreen === 'owner') {
    return 'owner';
  }

  if (requestedScreen === 'admin') {
    return 'admin';
  }

  if (requestedScreen === 'app' || params.has('media') || params.has('cafe') || params.has('table') || params.has('masa')) {
    return 'app';
  }

  return 'landing';
};

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'app' | 'admin' | 'owner'>(getInitialView);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT_COLOR);
  const [handwritingFont, setHandwritingFont] = useState(DEFAULT_HANDWRITING_FONT);
  const [cafeName, setCafeName] = useState(DEFAULT_CAFE_NAME);
  const [activeCafeSlug, setActiveCafeSlug] = useState(getInitialCafeSlug);
  const [resolvedTableLabel, setResolvedTableLabel] = useState(getInitialTableLabel);
  const [campaignTarget, setCampaignTarget] = useState(DEFAULT_CAMPAIGN_TARGET);
  const [campaignReward, setCampaignReward] = useState(DEFAULT_CAMPAIGN_REWARD);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDesktopCameraOpen, setIsDesktopCameraOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [shareMediaId, setShareMediaId] = useState<string | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [failedMediaIds, setFailedMediaIds] = useState<Record<string, true>>({});
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [isGoogleRedirectResolved, setIsGoogleRedirectResolved] = useState(false);
  const [isMediaItemsReady, setIsMediaItemsReady] = useState(false);
  const [pendingRedirectUpload, setPendingRedirectUpload] = useState<UploadDraft | null>(null);
  const [rewardCelebration, setRewardCelebration] = useState<RewardCelebration>(null);
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [ownerAccessError, setOwnerAccessError] = useState<string | null>(null);
  
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
      if (item.authorUid !== currentUserUid || item.cafeSlug !== activeCafeSlug) return false;
      if (!item.createdAt) return true; // If just uploaded and timestamp is pending, count it
      const itemDate = getMediaDate(item.createdAt);
      if (!itemDate) return false;
      return itemDate > oneWeekAgo;
    }).length;
  }, [mediaItems, currentUserUid, activeCafeSlug]);

  const isDeletable = (item: MediaItem) => {
    if (!item.createdAt) return true;
    const itemDate = getMediaDate(item.createdAt);
    if (!itemDate) return false;
    const now = new Date();
    const diffMinutes = (now.getTime() - itemDate.getTime()) / (1000 * 60);
    return diffMinutes <= 30;
  };

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const resumedPendingUploadRef = useRef(false);
  const sharePromptScheduledRef = useRef(false);
  const hiddenAdminTapCountRef = useRef(0);
  const hiddenAdminTapTimeoutRef = useRef<number | null>(null);
  const isAuthenticated = Boolean(currentUserUid);
  const hasOwnerAccess = hasOwnerPortalAccess(currentUserEmail);

  const syncCurrentUser = (user: User | null) => {
    setCurrentUserUid(user?.uid ?? null);
    setCurrentUserEmail(user?.email ?? null);
  };

  const rememberOwnerPortalIntent = () => {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.setItem(OWNER_PORTAL_INTENT_KEY, '1');
  };

  const clearOwnerPortalIntent = () => {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.removeItem(OWNER_PORTAL_INTENT_KEY);
  };

  const discardPendingUpload = async () => {
    try {
      await clearPendingUpload();
    } catch (error) {
      console.warn('Pending upload cleanup failed:', error);
    }
  };

  const markMediaAsFailed = (id: string) => {
    setFailedMediaIds((current) => (current[id] ? current : { ...current, [id]: true }));
  };

  const stopDesktopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsDesktopCameraOpen(false);
  };

  const clearUploadInputValues = () => {
    for (const input of [cameraInputRef.current]) {
      if (input) {
        input.value = '';
      }
    }
  };

  const resetUploadComposer = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    setCaption('');
    setUploadError(null);
    setUploadStatus(null);
    setUploadProgress(null);
    setEditRotation(0);
    setEditBrightness(100);
    setEditContrast(100);
    stopDesktopCamera();
    clearUploadInputValues();
  };

  const ensureGoogleUser = async ({
    beforeRedirect,
    statusMessage,
  }: {
    beforeRedirect?: () => Promise<void> | void;
    statusMessage?: string;
  } = {}) => {
    await waitForAuthInitialization();

    if (auth.currentUser) {
      syncCurrentUser(auth.currentUser);
      return auth.currentUser;
    }

    try {
      if (statusMessage) {
        setUploadStatus(statusMessage);
      }

      setUploadError(null);
      const result = await signInWithGoogle({ beforeRedirect });

      if (!result) {
        return null;
      }

      syncCurrentUser(result.user);
      return result.user;
    } catch (error) {
      const message = getGoogleSignInErrorMessage(error);
      setUploadError(message);
      setUploadStatus(null);
      console.error('Google sign-in error:', error);
      return null;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      syncCurrentUser(null);
      setCurrentView('app');
      setOwnerAccessError(null);
      setSelectedMediaId(null);
      setShareMediaId(null);
      setMediaToDelete(null);
      setUploadStatus(null);
      setUploadError(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleOpenComposer = async () => {
    setShowSharePrompt(false);
    setCurrentView('app');
    setSelectedMediaId(null);
    setUploadError(null);
    setUploadStatus(null);

    if (auth.currentUser) {
      setIsUploadModalOpen(true);
      return;
    }

    const user = await ensureGoogleUser();
    if (user) {
      setIsUploadModalOpen(true);
    }
  };

  const handleOpenAdminPanel = async () => {
    setOwnerAccessError(null);
    if (auth.currentUser) {
      setCurrentView('admin');
      return;
    }

    const user = await ensureGoogleUser();
    if (user) {
      setCurrentView('admin');
    }
  };

  const handleOpenOwnerPortal = async () => {
    setOwnerAccessError(null);

    if (auth.currentUser) {
      syncCurrentUser(auth.currentUser);

      if (!hasOwnerPortalAccess(auth.currentUser.email)) {
        setCurrentView('landing');
        setOwnerAccessError('Bu Google hesabı kafe sahibi erişim listesinde değil.');
        return;
      }

      clearOwnerPortalIntent();
      setCurrentView('owner');
      return;
    }

    const user = await ensureGoogleUser({
      beforeRedirect: () => rememberOwnerPortalIntent(),
    });

    if (!user) {
      return;
    }

    if (!hasOwnerPortalAccess(user.email)) {
      clearOwnerPortalIntent();
      setCurrentView('landing');
      setOwnerAccessError('Bu Google hesabı kafe sahibi erişim listesinde değil.');
      return;
    }

    clearOwnerPortalIntent();
    setCurrentView('owner');
  };

  const openCafeExperience = ({
    cafeSlug = activeCafeSlug,
    tableLabel = resolvedTableLabel || DEFAULT_DEMO_TABLE,
  }: {
    cafeSlug?: string;
    tableLabel?: string;
  } = {}) => {
    setOwnerAccessError(null);
    setActiveCafeSlug(normalizeCafeSlug(cafeSlug));
    setResolvedTableLabel(normalizeTableLabel(tableLabel, ''));
    setCurrentView('app');
    setSelectedMediaId(null);
    setShareMediaId(null);
  };

  const handleHiddenAdminTrigger = () => {
    if (hiddenAdminTapTimeoutRef.current) {
      window.clearTimeout(hiddenAdminTapTimeoutRef.current);
    }

    hiddenAdminTapCountRef.current += 1;

    if (hiddenAdminTapCountRef.current >= 5) {
      hiddenAdminTapCountRef.current = 0;
      hiddenAdminTapTimeoutRef.current = null;
      void handleOpenAdminPanel();
      return;
    }

    hiddenAdminTapTimeoutRef.current = window.setTimeout(() => {
      hiddenAdminTapCountRef.current = 0;
      hiddenAdminTapTimeoutRef.current = null;
    }, 2500);
  };

  const handleMediaSelection = async (mediaId: string) => {
    if (!auth.currentUser) {
      const user = await ensureGoogleUser();
      if (!user) {
        return;
      }
    }

    setSelectedMediaId(mediaId);
  };

  const buildUploadDraft = (): UploadDraft | null => {
    if (!selectedFile || !resolvedTableLabel) {
      return null;
    }

    return {
      file: selectedFile,
      caption,
      cafeSlug: activeCafeSlug,
      tableNumber: resolvedTableLabel,
      editRotation,
      editBrightness,
      editContrast,
    };
  };

  const countWeeklyUploadsForUser = (uid: string) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return mediaItems.filter(item => {
      if (item.authorUid !== uid || item.cafeSlug !== activeCafeSlug) return false;
      if (!item.createdAt) return true;
      const itemDate = getMediaDate(item.createdAt);
      if (!itemDate) return false;
      return itemDate > oneWeekAgo;
    }).length;
  };

  const countTotalUploadsForUser = (uid: string) =>
    mediaItems.filter(item => item.authorUid === uid && item.cafeSlug === activeCafeSlug).length;

  const buildRewardPreviewItems = (uid: string, latestUpload: RewardPreviewItem) =>
    mediaItems
      .filter((item) => item.authorUid === uid && item.cafeSlug === activeCafeSlug)
      .slice(0, Math.max(0, campaignTarget - 1))
      .map((item) => ({
        id: item.id,
        url: item.url,
        caption: item.caption,
      }))
      .reverse()
      .concat(latestUpload);

  const loadImageFromFile = async (file: File) => {
    const objectUrl = URL.createObjectURL(file);

    try {
      const image = new Image();
      image.src = objectUrl;

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Image could not be loaded.'));
      });

      return image;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const prepareFileForUpload = async (draft: UploadDraft) => {
    if (!draft.file.type.startsWith('image/')) {
      throw new Error('Yalnız fotoğraf yükleyebilirsiniz.');
    }

    const hasEdits = draft.editRotation !== 0 || draft.editBrightness !== 100 || draft.editContrast !== 100;
    const needsCompression = draft.file.size > MAX_UPLOAD_IMAGE_SIZE;

    setUploadStatus('Fotoğraf optimize ediliyor...');
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
    const image = await loadImageFromFile(draft.file);
    const scaleRatio = Math.min(1, MAX_UPLOAD_IMAGE_DIMENSION / Math.max(image.width, image.height));
    const targetWidth = Math.max(1, Math.round(image.width * scaleRatio));
    const targetHeight = Math.max(1, Math.round(image.height * scaleRatio));
    const needsResize = targetWidth !== image.width || targetHeight !== image.height;

    if (!hasEdits && !needsResize && !needsCompression) {
      return draft.file;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return draft.file;
    }

    if (Math.abs(draft.editRotation % 180) === 90) {
      canvas.width = targetHeight;
      canvas.height = targetWidth;
    } else {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((draft.editRotation * Math.PI) / 180);
    ctx.filter = `brightness(${draft.editBrightness}%) contrast(${draft.editContrast}%)`;
    ctx.drawImage(image, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.82);
    });

    if (!blob) {
      return draft.file;
    }

    const fileNameWithoutExtension = draft.file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${fileNameWithoutExtension}.jpg`, { type: 'image/jpeg' });
  };

  const performUpload = async (draft: UploadDraft, uid: string) => {
    if (!uid) {
      setUploadStatus(null);
      setUploadError('Giriş bilgisi doğrulanamadı. Lütfen tekrar deneyin.');
      return;
    }

    await auth.currentUser?.getIdToken(true);

    if (countWeeklyUploadsForUser(uid) >= MAX_WEEKLY_UPLOADS) {
      setUploadError(`Haftalık paylaşım limitinize (${MAX_WEEKLY_UPLOADS}) ulaştınız. Lütfen daha sonra tekrar deneyin.`);
      setUploadStatus(null);
      setUploadProgress(null);
      return false;
    }

    setIsSaving(true);
    setUploadError(null);
    setUploadProgress(0);
    setUploadStatus('Medya yükleniyor...');

    try {
      const fileToUpload = await prepareFileForUpload(draft);
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
          reject,
          resolve
        );
      });

      setUploadStatus('Bağlantı alınıyor...');
      const downloadUrl = await getDownloadURL(storageRef);
      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      setUploadStatus('Veritabanına kaydediliyor...');
      await addDoc(collection(db, 'media'), {
        url: downloadUrl,
        type: 'image',
        caption: normalizeLegacyText(draft.caption, DEFAULT_MEDIA_CAPTION),
        likedBy: [],
        likesCount: 0,
        rotation: Math.random() * 6 - 3,
        date: timeString,
        tableNumber: draft.tableNumber,
        cafeSlug: draft.cafeSlug,
        cafeName,
        authorUid: uid,
        createdAt: serverTimestamp()
      });

      const totalUploadsAfterSave = countTotalUploadsForUser(uid) + 1;
      if (campaignTarget > 0 && totalUploadsAfterSave % campaignTarget === 0) {
        setRewardCelebration({
          items: buildRewardPreviewItems(uid, {
            id: `reward-${Date.now()}`,
            url: downloadUrl,
            caption: normalizeLegacyText(draft.caption, DEFAULT_MEDIA_CAPTION),
          }),
          target: campaignTarget,
        });
      }

      void discardPendingUpload();
      setPendingRedirectUpload(null);
      setUploadStatus(null);
      setUploadProgress(null);
      setIsUploadModalOpen(false);
      resetUploadComposer();

      return true;
    } catch (error: any) {
      console.error("Error uploading media:", error);
      setUploadError(error.message || 'Yükleme sırasında bir hata oluştu.');
      setUploadStatus(null);
      setUploadProgress(null);
      return false;
    } finally {
      setIsSaving(false);
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
    if (!previewUrl) {
      return;
    }

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!isDesktopCameraOpen || !videoRef.current || !streamRef.current) {
      return;
    }

    const videoElement = videoRef.current;
    videoElement.srcObject = streamRef.current;

    const ensurePlayback = async () => {
      try {
        await videoElement.play();
      } catch (error) {
        console.error('Desktop camera playback failed:', error);
      }
    };

    void ensurePlayback();
  }, [isDesktopCameraOpen]);

  useEffect(() => () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (hiddenAdminTapTimeoutRef.current) {
      window.clearTimeout(hiddenAdminTapTimeoutRef.current);
      hiddenAdminTapTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);

    if (currentView === 'landing') {
      url.searchParams.delete('screen');
      url.searchParams.delete('cafe');
      url.searchParams.delete('table');
      url.searchParams.delete('masa');
      url.searchParams.delete('media');
      window.history.replaceState({}, '', url);
      return;
    }

    if (currentView === 'admin' || currentView === 'owner') {
      url.searchParams.set('screen', currentView);
      url.searchParams.set('cafe', activeCafeSlug);
      url.searchParams.delete('table');
      url.searchParams.delete('masa');
      url.searchParams.delete('media');
      window.history.replaceState({}, '', url);
      return;
    }

    if (currentView === 'app') {
      url.searchParams.set('screen', 'app');
      url.searchParams.set('cafe', activeCafeSlug);

      if (resolvedTableLabel) {
        url.searchParams.set('table', resolvedTableLabel);
      } else {
        url.searchParams.delete('table');
      }

      if (selectedMediaId) {
        url.searchParams.set('media', selectedMediaId);
      } else {
        url.searchParams.delete('media');
      }

      window.history.replaceState({}, '', url);
    }
  }, [activeCafeSlug, currentView, resolvedTableLabel, selectedMediaId]);

  useEffect(() => {
    if (!isAuthResolved || !isGoogleRedirectResolved) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    if (window.sessionStorage.getItem(OWNER_PORTAL_INTENT_KEY) !== '1') {
      return;
    }

    clearOwnerPortalIntent();

    if (!currentUserEmail) {
      return;
    }

    if (hasOwnerPortalAccess(currentUserEmail)) {
      setOwnerAccessError(null);
      setCurrentView('owner');
      return;
    }

    setCurrentView('landing');
    setOwnerAccessError('Bu Google hesabı kafe sahibi erişim listesinde değil.');
  }, [currentUserEmail, isAuthResolved, isGoogleRedirectResolved]);

  useEffect(() => {
    if (currentView !== 'owner' || !currentUserEmail) {
      return;
    }

    if (hasOwnerPortalAccess(currentUserEmail)) {
      return;
    }

    setCurrentView('landing');
    setOwnerAccessError('Bu Google hesabı kafe sahibi erişim listesinde değil.');
  }, [currentUserEmail, currentView]);

  useEffect(() => {
    if (!isAuthResolved || !isGoogleRedirectResolved || currentView !== 'app' || !resolvedTableLabel) {
      return;
    }

    if (sharePromptScheduledRef.current) {
      return;
    }

    if (window.sessionStorage.getItem('share-vibe-promo-seen') === '1') {
      return;
    }

    sharePromptScheduledRef.current = true;
    const timeout = window.setTimeout(() => {
      window.sessionStorage.setItem('share-vibe-promo-seen', '1');
      setShowSharePrompt(true);
    }, 18000 + Math.round(Math.random() * 18000));

    return () => {
      window.clearTimeout(timeout);
    };
  }, [currentView, isAuthResolved, isGoogleRedirectResolved, resolvedTableLabel]);

  useEffect(() => {
    if (currentView !== 'app' || !isUploadModalOpen) {
      return;
    }

    setShowSharePrompt(false);
  }, [currentView, isUploadModalOpen]);

  useEffect(() => {
    const unsubscribeSettings = onSnapshot(doc(db, 'cafes', activeCafeSlug), (snapshot) => {
      if (!snapshot.exists()) {
        setAccentColor(DEFAULT_ACCENT_COLOR);
        setHandwritingFont(DEFAULT_HANDWRITING_FONT);
        setCafeName(DEFAULT_CAFE_NAME);
        setCampaignTarget(DEFAULT_CAMPAIGN_TARGET);
        setCampaignReward(DEFAULT_CAMPAIGN_REWARD);
        return;
      }

      const data = snapshot.data();
      if (typeof data.accentColor === 'string' && data.accentColor) {
        setAccentColor(data.accentColor);
      } else {
        setAccentColor(DEFAULT_ACCENT_COLOR);
      }

      setHandwritingFont(normalizeHandwritingFont(data.handwritingFont));
      setCafeName(normalizeLegacyText(data.cafeName, DEFAULT_CAFE_NAME));

      if (typeof data.campaignTarget === 'number' && Number.isFinite(data.campaignTarget)) {
        setCampaignTarget(data.campaignTarget);
      } else {
        setCampaignTarget(DEFAULT_CAMPAIGN_TARGET);
      }

      setCampaignReward(normalizeLegacyText(data.campaignReward, DEFAULT_CAMPAIGN_REWARD));
    });

    return () => unsubscribeSettings();
  }, [activeCafeSlug]);

  useEffect(() => {
    let isCancelled = false;

    const resolveGoogleRedirect = async () => {
      try {
        const [redirectResult, pendingUpload] = await Promise.all([
          resolveGoogleSignInRedirect(),
          getPendingUpload().catch((error) => {
            console.warn('Pending upload restore failed:', error);
            return null;
          }),
        ]);

        if (isCancelled) {
          return;
        }

        if (redirectResult) {
          syncCurrentUser(redirectResult.user);
        }

        if (pendingUpload) {
          setPendingRedirectUpload(pendingUpload);
        }
      } catch (error) {
        console.error('Error resolving Google redirect:', error);
        await discardPendingUpload();

        if (!isCancelled) {
          setUploadError(getGoogleSignInErrorMessage(error));
          setUploadStatus(null);
          setUploadProgress(null);
          setPendingRedirectUpload(null);
        }
      } finally {
        if (!isCancelled) {
          setIsGoogleRedirectResolved(true);
        }
      }
    };

    void resolveGoogleRedirect();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      syncCurrentUser(user);
      setIsAuthResolved(true);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isAuthResolved) {
      setMediaItems([]);
      setIsMediaItemsReady(false);
      return;
    }

    setIsMediaItemsReady(false);
    const q = query(collection(db, 'media'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: MediaItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === 'video') {
          return;
        }

        items.push({
          id: doc.id,
          url: typeof data.url === 'string' ? data.url : '',
          type: 'image',
          caption: normalizeLegacyText(data.caption, DEFAULT_MEDIA_CAPTION),
          likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0,
          likedBy: Array.isArray(data.likedBy)
            ? data.likedBy.filter((value: unknown): value is string => typeof value === 'string')
            : [],
          rotation: typeof data.rotation === 'number' ? data.rotation : 0,
          date: normalizeLegacyText(data.date, '--:--'),
          tableNumber: normalizeTableLabel(data.tableNumber, 'Masa'),
          cafeSlug: normalizeCafeSlug(data.cafeSlug ?? DEFAULT_CAFE_SLUG),
          authorUid: typeof data.authorUid === 'string' ? data.authorUid : '',
          createdAt: data.createdAt
        });
      });
      startTransition(() => {
        setFailedMediaIds({});
        setMediaItems(items);
        setIsMediaItemsReady(true);
      });
    }, (error) => {
      console.error("Error fetching media:", error);
      setIsMediaItemsReady(true);
    });

    return () => unsubscribe();
  }, [isAuthResolved]);

  useEffect(() => {
    if (
      !pendingRedirectUpload ||
      resumedPendingUploadRef.current ||
      !isAuthResolved ||
      !isGoogleRedirectResolved ||
      !isMediaItemsReady ||
      !currentUserUid
    ) {
      return;
    }

    resumedPendingUploadRef.current = true;
    setActiveCafeSlug(normalizeCafeSlug(pendingRedirectUpload.cafeSlug, activeCafeSlug));
    setResolvedTableLabel(normalizeTableLabel(pendingRedirectUpload.tableNumber, ''));
    setCurrentView('app');
    setIsUploadModalOpen(true);
    setSelectedFile(pendingRedirectUpload.file);
    setPreviewUrl(URL.createObjectURL(pendingRedirectUpload.file));
    setCaption(pendingRedirectUpload.caption);
    setEditRotation(pendingRedirectUpload.editRotation);
    setEditBrightness(pendingRedirectUpload.editBrightness);
    setEditContrast(pendingRedirectUpload.editContrast);
    setUploadError(null);
    setUploadStatus('Google girişi tamamlandı. Paylaşım gönderiliyor...');

    void performUpload(pendingRedirectUpload, currentUserUid).finally(() => {
      void discardPendingUpload();
      setPendingRedirectUpload(null);
    });
  }, [
    pendingRedirectUpload,
    isAuthResolved,
    isGoogleRedirectResolved,
    isMediaItemsReady,
    currentUserUid,
    mediaItems,
    campaignTarget,
    activeCafeSlug,
  ]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mediaParam = params.get('media');

    if (mediaParam && mediaItems.some(item => item.id === mediaParam && item.cafeSlug === activeCafeSlug)) {
      setSelectedMediaId(mediaParam);
    }
  }, [activeCafeSlug, mediaItems]);

  useEffect(() => {
    if (selectedMediaId && !mediaItems.some((item) => item.id === selectedMediaId && item.cafeSlug === activeCafeSlug)) {
      setSelectedMediaId(null);
    }
  }, [activeCafeSlug, mediaItems, selectedMediaId]);

  const handleUpload = async () => {
    const draft = buildUploadDraft();

    if (!draft) {
      if (!resolvedTableLabel) {
        setUploadError('Paylaşım için masa QR koduyla giriş yapılması gerekir.');
      }
      return;
    }

    let uid = currentUserUid ?? auth.currentUser?.uid ?? null;

    if (!uid) {
      const user = await ensureGoogleUser({
        beforeRedirect: () => savePendingUpload(draft),
        statusMessage: 'Google ile giriş açılıyor...',
      });

      if (!user) {
        if (!auth.currentUser) {
          setUploadStatus('Google girişi için yönlendiriliyorsunuz...');
        }
        return;
      }

      uid = user.uid;
      void discardPendingUpload();
      setUploadStatus('Giriş doğrulanıyor...');
    }

    if (!uid) {
      setUploadStatus(null);
      setUploadError('Giriş bilgisi doğrulanamadı. Lütfen tekrar deneyin.');
      return;
    }

    await performUpload(draft, uid);
  };

  const isMobileCameraDevice = () => {
    if (typeof navigator === 'undefined') {
      return false;
    }

    const userAgent = navigator.userAgent;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
      || (/Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1);
  };

  const startDesktopCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setUploadError('Kamera açılamadı.');
      return;
    }

    try {
      stopDesktopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setIsDesktopCameraOpen(true);
    } catch (error) {
      console.error('Desktop camera access failed:', error);
      setUploadError('Kamera açılamadı.');
      stopDesktopCamera();
    }
  };

  const openUploadSource = () => {
    setUploadError(null);
    setUploadStatus(null);
    setUploadProgress(null);

    if (!resolvedTableLabel) {
      setUploadError('Paylaşım için masa QR koduyla giriş yapılması gerekir.');
      return;
    }

    if (isMobileCameraDevice()) {
      cameraInputRef.current?.click();
      return;
    }

    void startDesktopCamera();
  };

  const handleSelectedFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setUploadError('Yalnız fotoğraf yükleyebilirsiniz.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUploadError(null);
    setUploadStatus(null);
    setUploadProgress(null);
    setEditRotation(0);
    setEditBrightness(100);
    setEditContrast(100);
  };

  const captureDesktopPhoto = () => {
    if (!videoRef.current) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }

      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadError(null);
      setUploadStatus(null);
      setUploadProgress(null);
      setEditRotation(0);
      setEditBrightness(100);
      setEditContrast(100);
      stopDesktopCamera();
    }, 'image/jpeg', 0.92);
  };

  const cancelUpload = () => {
    setIsUploadModalOpen(false);
    resetUploadComposer();
  };

  const toggleLike = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    let uid = currentUserUid ?? auth.currentUser?.uid ?? null;
    if (!uid) {
      const user = await ensureGoogleUser();
      if (!user) {
        return;
      }

      uid = user.uid;
    }

    await auth.currentUser?.getIdToken(true);

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
      await deleteMediaRecord(id, item?.url);
      if (selectedMediaId === id) {
        setSelectedMediaId(null);
      }
    } catch (error) {
      console.error("Error deleting media:", error);
      setUploadError("Silme işlemi başarısız oldu.");
    }
  };

  const handleCopyLink = async (id: string) => {
    const item = mediaItems.find((entry) => entry.id === id);
    const url = buildCafePublicLink({
      origin: window.location.origin,
      cafeSlug: item?.cafeSlug ?? activeCafeSlug,
      tableLabel: item?.tableNumber ?? resolvedTableLabel,
    });
    const shareUrl = new URL(url);
    shareUrl.searchParams.set('media', id);

    try {
      await navigator.clipboard.writeText(shareUrl.toString());
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Kopyalama hatası:', error);
      window.prompt('Bağlantıyı kopyalayın:', shareUrl.toString());
    }
  };

  const shareToInstagramStory = async (mediaId: string) => {
    const item = mediaItems.find(m => m.id === mediaId);
    if (!item) return;

    try {
      let file: File | null = null;
      try {
        // Fetch the image to create a blob
        const response = await fetch(item.url);
        if (!response.ok) {
          throw new Error(`Media fetch failed with status ${response.status}`);
        }
        const blob = await response.blob();
        file = new File([blob], 'story.jpg', { type: 'image/jpeg' });
      } catch (fetchError) {
        console.warn("Could not fetch image for sharing (CORS issue), falling back to URL share.", fetchError);
      }

      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        // Sadece dosyayı paylaşırsak Instagram bunu Hikaye/Akış olarak algılar.
        // Metin veya URL eklersek sadece Mesaj (DM) olarak algılar.
        await navigator.share({
          files: [file]
        });
      } else if (navigator.canShare) {
        // Dosya paylaşılamıyorsa sadece linki paylaş
        await navigator.share({
          title: 'Anı',
          text: item.caption || 'Bu harika anıya göz at!',
          url: (() => {
            const shareItem = mediaItems.find((entry) => entry.id === mediaId);
            const shareUrl = new URL(
              buildCafePublicLink({
                origin: window.location.origin,
                cafeSlug: shareItem?.cafeSlug ?? activeCafeSlug,
                tableLabel: shareItem?.tableNumber ?? resolvedTableLabel,
              })
            );
            shareUrl.searchParams.set('media', mediaId);
            return shareUrl.toString();
          })()
        });
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

  const cafeMediaItems = useMemo(
    () => mediaItems.filter((item) => item.cafeSlug === activeCafeSlug),
    [mediaItems, activeCafeSlug]
  );
  const selectedMedia = isAuthenticated && selectedMediaId ? cafeMediaItems.find(m => m.id === selectedMediaId) : null;
  const deferredMediaItems = useDeferredValue(cafeMediaItems);
  const isGuestPreview = !isAuthenticated;
  const userTotalUploadsCount = currentUserUid ? countTotalUploadsForUser(currentUserUid) : 0;
  const campaignProgressCount = isAuthenticated ? getCampaignProgressCount(userTotalUploadsCount, campaignTarget) : 0;
  const campaignRemainingCount = Math.max(campaignTarget - campaignProgressCount, 0);
  const rewardPreviewItems = rewardCelebration?.items ?? [];

  if (currentView !== 'landing' && (!isAuthResolved || !isGoogleRedirectResolved)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-cafe-50">
        <div className="section-shell max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--color-accent)]/12 text-[color:var(--color-accent)]">
            <Coffee className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-semibold text-cafe-50">Hesap durumu kontrol ediliyor</h1>
          <p className="mt-3 text-sm leading-7 text-cafe-100/70">
            Google oturumun doğrulanıyor. Giriş yaptıysan hesabın otomatik olarak geri yüklenecek.
          </p>
        </div>
      </div>
    );
  }

  if (currentView === 'admin') {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center px-4 text-cafe-50">
            <div className="section-shell max-w-md text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--color-accent)]/12 text-[color:var(--color-accent)]">
                <Settings className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-semibold text-cafe-50">Admin paneli yükleniyor</h1>
              <p className="mt-3 text-sm leading-7 text-cafe-100/70">
                Yönetim modülü ayrı yüklendiği için açılış performansı korunuyor.
              </p>
            </div>
          </div>
        }
      >
        <AdminPanel
          cafeSlug={activeCafeSlug}
          onCafeSlugChange={setActiveCafeSlug}
          onBack={() => setCurrentView('app')}
          portalMode="admin"
          onOpenCafeEnvironment={(slug) =>
            openCafeExperience({
              cafeSlug: slug,
              tableLabel: DEFAULT_DEMO_TABLE,
            })
          }
        />
      </Suspense>
    );
  }

  if (currentView === 'owner') {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center px-4 text-cafe-50">
            <div className="section-shell max-w-md text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--color-accent)]/12 text-[color:var(--color-accent)]">
                <Settings className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-semibold text-cafe-50">Kafe sahibi paneli yükleniyor</h1>
              <p className="mt-3 text-sm leading-7 text-cafe-100/70">
                Kafe kurulum modülü hazırlanıyor.
              </p>
            </div>
          </div>
        }
      >
        <AdminPanel
          cafeSlug={activeCafeSlug}
          onCafeSlugChange={setActiveCafeSlug}
          onBack={() => setCurrentView('landing')}
          portalMode="owner"
          onOpenCafeEnvironment={(slug) =>
            openCafeExperience({
              cafeSlug: slug,
              tableLabel: DEFAULT_DEMO_TABLE,
            })
          }
        />
      </Suspense>
    );
  }

  if (currentView === 'landing') {
    return (
      <div className="min-h-screen pb-20 font-sans selection:bg-accent/20 relative text-cafe-50">
        <AnimatedBackground />
        <div className="relative z-10">
          <MainPage
            onOpenExperience={() =>
              openCafeExperience({
                cafeSlug: activeCafeSlug,
                tableLabel: resolvedTableLabel || DEFAULT_DEMO_TABLE,
              })
            }
            onOpenOwnerPortal={() => void handleOpenOwnerPortal()}
            onHiddenAdminTrigger={handleHiddenAdminTrigger}
            ownerEmail={currentUserEmail}
            ownerAccessError={ownerAccessError}
            hasOwnerAccess={hasOwnerAccess}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 font-sans selection:bg-accent/20 relative text-cafe-50">
      <AnimatedBackground />

      <div className="relative z-10">
        <header className="sticky top-0 z-30 border-b border-white/45 bg-white/80 backdrop-blur-2xl shadow-[0_14px_34px_rgba(69,49,35,0.05)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="header-bar">
              <div className="header-brand">
                <button
                  type="button"
                  onClick={handleHiddenAdminTrigger}
                  className="ambient-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--color-accent)]/12 text-[color:var(--color-accent)] shadow-inner cursor-default"
                  aria-label="Kafe logosu"
                >
                  <Coffee className="w-5 h-5" />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="truncate text-xl sm:text-2xl font-serif font-semibold tracking-[0.02em] text-cafe-50">
                      {cafeName}
                    </h1>
                    <span className="hidden md:inline-flex items-center rounded-full border border-cafe-700/70 bg-white/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cafe-100/62">
                      Anı Galerisi
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-cafe-100/60">
                    Fotoğraf paylaş, anını galeride hemen gör.
                  </p>
                </div>
              </div>

              <nav className="header-nav-shell" aria-label="Sayfa kısayolları">
                <a href="#gallery" className="header-nav-link">Galeri</a>
                <a href="#campaign" className="header-nav-link">Kampanya</a>
              </nav>

              <div className="header-actions">
                {isAuthenticated && (
                  <div
                    className="hidden lg:flex items-center gap-2 rounded-full border border-cafe-700/70 bg-white/78 px-3 py-2 text-sm text-cafe-100/72 shadow-sm"
                    title={currentUserEmail ?? 'Google hesabı açık'}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${userUploadsThisWeekCount >= MAX_WEEKLY_UPLOADS ? 'bg-red-500' : 'bg-accent'}`} />
                    <span className="font-medium">
                      {userUploadsThisWeekCount}/{MAX_WEEKLY_UPLOADS} paylaşım hakkı
                    </span>
                  </div>
                )}

                {isAuthenticated ? (
                  <>
                    <button
                      onClick={() => void handleOpenComposer()}
                      className="header-primary-action hidden sm:inline-flex"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Paylaş</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="hidden lg:inline-flex items-center justify-center rounded-full border border-cafe-700/70 bg-white/78 px-4 py-2 text-sm font-semibold text-cafe-50 transition-colors hover:border-accent/40"
                    >
                      Çıkış
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => void ensureGoogleUser()}
                    className="header-primary-action hidden sm:inline-flex"
                  >
                    <span>Giriş Yap</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 space-y-8 sm:space-y-10">
          <section id="experience">
            <div className="section-shell relative overflow-hidden">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-[color:var(--color-accent)]/18 via-white/30 to-transparent" />
              <span className="section-pill">Kolay paylaşım</span>
              <div className="relative space-y-5">
                <div className="space-y-3">
                  <h2 className="max-w-3xl text-4xl sm:text-5xl xl:text-6xl font-serif leading-[0.92] text-cafe-50">
                    Kafedeki güzel anları birkaç saniyede paylaşın.
                  </h2>
                  <p className="max-w-2xl text-sm sm:text-base leading-7 text-cafe-100/72">
                    Masanızı seçin, fotoğrafınızı ekleyin ve paylaşımınız anında galeride yerini alsın. Diğer misafirlerin bıraktığı anıları da tek akışta keşfedin.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => void handleOpenComposer()}
                    className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent)] px-5 py-3 text-sm font-semibold tracking-[0.18em] uppercase text-white shadow-[0_20px_45px_rgba(0,0,0,0.12)] transition-transform hover:-translate-y-0.5"
                  >
                    <Camera className="w-4 h-4" />
                    {isAuthenticated ? 'Fotoğraf Paylaş' : 'Giriş Yap'}
                  </button>
                  <a
                    href="#gallery"
                    className="inline-flex items-center gap-2 rounded-full border border-cafe-700/80 bg-white/75 px-5 py-3 text-sm font-semibold text-cafe-100 transition-colors hover:border-accent/50 hover:text-cafe-50"
                  >
                    Galeriyi Gör
                  </a>
                </div>

              </div>
            </div>

          </section>

          <section id="campaign" className="section-shell scroll-mt-28 lg:scroll-mt-32">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <span className="section-pill">Aktif kampanyalar</span>
                <h2 className="text-3xl sm:text-4xl font-serif font-semibold text-cafe-50">
                  {campaignTarget} foto paylaş, {campaignReward} kazan
                </h2>
                <p className="text-sm sm:text-base leading-7 text-cafe-100/72">
                  Her yeni anı paylaşımında kahve adımları doluyor. Hedef tamamlandığında ekranda ödül bildirimi açılır.
                </p>
              </div>

              <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_24px_54px_rgba(79,56,41,0.08)] lg:min-w-[360px]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-cafe-100/55">Kampanya takibi</p>
                    <p className="mt-2 text-lg font-semibold text-cafe-50">
                      {campaignProgressCount}/{campaignTarget} kahve adımı dolu
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[color:var(--color-accent)]/12 p-3 text-[color:var(--color-accent)]">
                    <Coffee className="w-5 h-5" />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Array.from({ length: Math.max(campaignTarget, 1) }, (_, index) => {
                    const isActive = index < campaignProgressCount;
                    return (
                      <div
                        key={`campaign-step-${index}`}
                        className={`rounded-[1.4rem] border px-3 py-4 text-center transition-all ${
                          isActive
                            ? 'border-transparent bg-[color:var(--color-accent)] text-white shadow-[0_16px_34px_rgba(0,0,0,0.14)]'
                            : 'border-cafe-700/70 bg-white text-cafe-100/55'
                        }`}
                      >
                        <Coffee className="mx-auto h-5 w-5" />
                        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                          {index + 1}. foto
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 flex items-center justify-between rounded-2xl border border-cafe-700/70 bg-[color:var(--color-accent)]/7 px-4 py-3 text-sm">
                  <span className="text-cafe-100/70">
                    {isAuthenticated
                      ? campaignRemainingCount === 0
                        ? 'Hedef tamamlandı'
                        : `${campaignRemainingCount} foto daha kaldı`
                      : 'Giriş yapıp ilerlemeni takip et'}
                  </span>
                  <strong className="text-cafe-50">Ödül: {campaignReward}</strong>
                </div>
              </div>
            </div>
          </section>

          <section id="gallery" className="space-y-5 scroll-mt-28 lg:scroll-mt-32">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <span className="section-pill">Canlı Galeri</span>
                <h2 className="text-3xl sm:text-4xl font-serif font-semibold text-cafe-50">
                  Son paylaşılan anlar
                </h2>
                <p className="max-w-2xl text-sm sm:text-base leading-7 text-cafe-100/72">
                  Misafirlerin bıraktığı fotoğraflar burada listelenir. Giriş yapmayan kullanıcılar içerikleri bulanık önizleme olarak görür.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center rounded-full border border-cafe-700/80 bg-white/75 px-4 py-2 text-sm text-cafe-100/72">
                  {deferredMediaItems.length} fotoğraf
                </div>
                <div className="inline-flex items-center rounded-full border border-cafe-700/80 bg-white/75 px-4 py-2 text-sm text-cafe-100/72">
                  Ödül: {campaignReward}
                </div>
              </div>
            </div>

            {deferredMediaItems.length === 0 ? (
              <div className="section-shell text-center py-14">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--color-accent)]/12 text-[color:var(--color-accent)]">
                  <Camera className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-semibold text-cafe-50">Henüz paylaşım yok</h3>
                <p className="mt-3 max-w-xl mx-auto text-sm sm:text-base leading-7 text-cafe-100/70">
                  İlk fotoğrafı paylaşarak galeriyi başlatabilirsiniz. Yeni paylaşımlar burada sırasıyla görünecek.
                </p>
              </div>
            ) : (
              <div className="gallery-grid">
                {deferredMediaItems.map((item) => {
                  const isLiked = Boolean(currentUserUid && item.likedBy.includes(currentUserUid));
                  const canDelete = currentUserUid === item.authorUid && isDeletable(item);

                  return (
                    <article key={item.id} className="gallery-grid-item">
                      <div className="gallery-card group">
                        <button
                          type="button"
                          className="gallery-media"
                          onClick={() => void handleMediaSelection(item.id)}
                        >
                          {!item.url || failedMediaIds[item.id] ? (
                            <BrokenMediaPlaceholder compact message="Görsel yüklenemedi" />
                          ) : (
                            <img
                              src={item.url}
                              alt={item.caption}
                              className={`w-full h-full object-cover transition-transform duration-500 ${isGuestPreview ? 'scale-[1.06] blur-[10px] brightness-[0.9]' : 'group-hover:scale-[1.03]'}`}
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              onError={() => markMediaAsFailed(item.id)}
                            />
                          )}

                          <div className="gallery-card-topbar">
                            <span className="gallery-chip gallery-chip--light">
                              {item.tableNumber}
                            </span>
                            <span className="gallery-chip gallery-chip--dark">
                              {item.date}
                            </span>
                          </div>

                          <div className={`gallery-media-overlay ${isGuestPreview ? 'is-guest' : ''}`} />
                          {!isGuestPreview && (
                            <div className="gallery-card-cta-wrap">
                              <span className="gallery-card-cta">
                                Yakından Bak
                              </span>
                            </div>
                          )}
                        </button>

                        <div className="gallery-card-body">
                          <p className="gallery-caption">
                            {item.caption}
                          </p>

                          <div className="gallery-card-footer">
                            <div className="gallery-card-actions">
                              {canDelete && (
                                <button
                                  onClick={(event) => handleDelete(item.id, event)}
                                  className="icon-button gallery-action-button text-red-500 hover:border-red-200 hover:bg-red-50"
                                  aria-label="Anıyı sil"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setShareMediaId(item.id);
                                }}
                                className="icon-button gallery-action-button"
                                aria-label="Paylaş"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(event) => toggleLike(item.id, event)}
                                className={`gallery-like-button ${isLiked ? 'is-liked' : ''}`}
                              >
                                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                                <span>{item.likesCount}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      <div className="fixed bottom-5 sm:bottom-8 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-3">
        {isAuthenticated && (
          <div className="rounded-full border border-white/60 bg-white/82 px-4 py-2 text-xs text-cafe-100 shadow-[0_12px_35px_rgba(73,52,38,0.12)] backdrop-blur-xl">
            <span className="font-semibold">Haftalık limit:</span> {userUploadsThisWeekCount}/{MAX_WEEKLY_UPLOADS}
          </div>
        )}
        <button
          onClick={() => void handleOpenComposer()}
          className="floating-upload-button"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/18">
            <Camera className="w-5 h-5" />
          </span>
          <span className="flex flex-col items-start">
            <span className="text-[11px] uppercase tracking-[0.24em] text-white/70">Hızlı İşlem</span>
            <span className="text-sm sm:text-base font-semibold text-white">{isAuthenticated ? 'Yeni anı paylaş' : 'Giriş yapıp paylaş'}</span>
          </span>
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
                {!selectedMedia.url || failedMediaIds[selectedMedia.id] ? (
                  <BrokenMediaPlaceholder message="Bu medya şu anda görüntülenemiyor" />
                ) : (
                  <img
                    src={selectedMedia.url}
                    alt={selectedMedia.caption}
                    className="absolute inset-0 w-full h-full object-contain"
                    onError={() => markMediaAsFailed(selectedMedia.id)}
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
              
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleSelectedFileChange}
              />

              {!previewUrl && !isDesktopCameraOpen ? (
                <div className="p-6 sm:p-8 flex flex-col gap-4">
                  <div className="rounded-xl border border-cafe-700 bg-cafe-900/55 px-4 py-4 text-sm text-cafe-100/72">
                    <p className="font-semibold text-cafe-50">Kafe: {cafeName}</p>
                    <p className="mt-1">
                      {resolvedTableLabel
                        ? `QR ile tanınan masa: ${resolvedTableLabel}`
                        : 'Paylaşım için masa QR koduyla açılmış bir bağlantı gerekir.'}
                    </p>
                  </div>
                  <button
                    onClick={openUploadSource}
                    disabled={!resolvedTableLabel}
                    className="flex items-center justify-center gap-3 w-full py-4 bg-cafe-700 hover:bg-cafe-600 text-cafe-50 rounded-xl transition-colors shadow-lg disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Camera className="w-6 h-6 text-accent" />
                    <span className="font-medium text-lg">Kamera ile Çek</span>
                  </button>
                </div>
              ) : isDesktopCameraOpen ? (
                <div className="p-4 sm:p-5 flex flex-col items-center gap-4">
                  <div className="relative w-full rounded-xl overflow-hidden bg-black aspect-[3/4] sm:aspect-video flex items-center justify-center shadow-inner border border-cafe-700">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover [transform:scaleX(-1)]"
                    />
                  </div>

                  <div className="flex gap-3 w-full">
                    <button
                      onClick={cancelUpload}
                      className="flex-1 px-4 py-3 rounded-xl font-medium text-cafe-100 hover:bg-cafe-700 transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      onClick={captureDesktopPhoto}
                      className="flex-1 px-4 py-3 rounded-xl font-medium bg-accent hover:brightness-110 text-cafe-900 shadow-lg shadow-accent/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <Camera className="w-5 h-5" />
                      Fotoğraf Çek
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Modal Body (Scrollable) */}
                  <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-5">
                <div className="grid gap-2">
                  <button
                    onClick={openUploadSource}
                    className="rounded-xl border border-cafe-700 bg-cafe-800/65 px-3 py-2.5 text-sm font-medium text-cafe-50 transition-colors hover:bg-cafe-700"
                  >
                    Tekrar Çek
                  </button>
                </div>

                {/* Media Preview Container */}
                <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden bg-cafe-900 border border-cafe-700 shadow-inner shrink-0 flex items-center justify-center">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-contain transition-all"
                    style={{
                      transform: `rotate(${editRotation}deg)`,
                      filter: `brightness(${editBrightness}%) contrast(${editContrast}%)`
                    }}
                  />
                </div>

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
                
                <div className="space-y-4 shrink-0">
                  <div className="rounded-xl border border-cafe-700 bg-cafe-900/55 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cafe-100/50">QR bilgisi</p>
                    <div className="mt-2 flex items-center gap-2 text-sm text-cafe-100/72">
                      <MapPin className="h-4 w-4 text-[color:var(--color-accent)]" />
                      <span>{resolvedTableLabel || 'Masa tanınmadı'}</span>
                    </div>
                    <p className="mt-2 text-sm text-cafe-100/60">{cafeName}</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="caption" className="block text-sm font-medium text-cafe-100/70">
                      Fotoğrafa bir not düş (İsteğe bağlı)
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

      {/* Reward Modal */}
      <AnimatePresence>
        {rewardCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-cafe-900/70 backdrop-blur-md"
            onClick={() => setRewardCelebration(null)}
          >
            <motion.div
              initial={{ scale: 0.88, y: 32 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 24, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="w-full max-w-xl rounded-[2rem] border border-white/20 bg-[linear-gradient(160deg,rgba(255,255,255,0.92),rgba(245,236,226,0.95))] p-6 shadow-[0_32px_80px_rgba(33,24,19,0.35)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[color:var(--color-accent)]/14 text-[color:var(--color-accent)]">
                  <Sparkles className="h-8 w-8" />
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-cafe-100/55">Kampanya tamamlandı</p>
                <h2 className="mt-3 text-3xl font-serif font-semibold text-cafe-50">
                  Tebrikler, {campaignReward} kazandın
                </h2>
                <p className="mt-3 text-sm leading-7 text-cafe-100/72">
                  {rewardCelebration.target} paylaşımı tamamladın. Son karelerin ve dolan kahve adımların burada.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: rewardCelebration.target }, (_, index) => (
                  <div
                    key={`reward-step-${index}`}
                    className="rounded-[1.35rem] bg-[color:var(--color-accent)] px-3 py-4 text-center text-white shadow-[0_16px_34px_rgba(0,0,0,0.14)]"
                  >
                    <Coffee className="mx-auto h-5 w-5" />
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                      {index + 1}. foto
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 rounded-[1.75rem] border border-cafe-700/15 bg-white/78 p-3">
                {rewardPreviewItems.map((item) => (
                  <div key={item.id} className="relative aspect-square overflow-hidden rounded-[1.25rem] bg-cafe-800">
                    <img
                      src={item.url}
                      alt={item.caption}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-3">
                      <p className="line-clamp-2 text-sm text-white" style={{ fontFamily: handwritingFont }}>
                        {item.caption}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setRewardCelebration(null)}
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[color:var(--color-accent)] px-4 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_18px_36px_rgba(0,0,0,0.18)] transition-transform hover:-translate-y-0.5"
              >
                Tamam
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSharePrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] flex items-end justify-center bg-cafe-900/45 p-4 backdrop-blur-sm sm:items-center"
            onClick={() => setShowSharePrompt(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/55 bg-[linear-gradient(160deg,rgba(255,255,255,0.96),rgba(243,234,223,0.95))] p-6 shadow-[0_28px_80px_rgba(58,41,31,0.22)]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                onClick={() => setShowSharePrompt(false)}
                className="absolute right-4 top-4 rounded-full p-2 text-cafe-100/45 transition-colors hover:bg-white/70 hover:text-cafe-50"
                aria-label="Bildirim kapat"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="pr-10">
                <span className="section-pill">Yeni anı zamanı</span>
                <h3 className="mt-4 text-3xl font-serif font-semibold text-cafe-50">
                  Bir kare daha bırak, kahve adımın dolsun
                </h3>
                <p className="mt-3 text-sm leading-7 text-cafe-100/72">
                  Şu an yeni bir anı paylaşıp galeriye eklenebilir ve kampanya ilerlemeni artırabilirsin.
                </p>
              </div>

              <button
                onClick={() => void handleOpenComposer()}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--color-accent)] px-5 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_18px_36px_rgba(0,0,0,0.14)] transition-transform hover:-translate-y-0.5"
              >
                <Camera className="h-4 w-4" />
                Anı paylaş
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
