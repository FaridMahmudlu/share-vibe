import React, { useState, useEffect, useCallback } from 'react';
import { Shield, X } from 'lucide-react';

/**
 * [SV-13] GDPR / KVKK Cookie Consent Banner
 * 
 * Displays a non-intrusive, bottom-fixed consent banner on first visit.
 * Stores the user's choice in localStorage to avoid repeated prompts.
 * 
 * Consent categories:
 * - Essential (always on, cannot be toggled)
 * - Analytics (optional)
 * - Marketing (optional)
 */

const CONSENT_STORAGE_KEY = 'sharevibe_cookie_consent';
const CONSENT_VERSION = '1.0';

interface ConsentState {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  version: string;
}

const getStoredConsent = (): ConsentState | null => {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as ConsentState;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
};

const storeConsent = (consent: ConsentState) => {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // localStorage unavailable
  }
};

/**
 * Check if the user has given cookie consent (any decision).
 */
export const hasGivenConsent = (): boolean => {
  return getStoredConsent() !== null;
};

/**
 * Check if analytics consent was granted.
 */
export const hasAnalyticsConsent = (): boolean => {
  const consent = getStoredConsent();
  return consent?.analytics || false;
};

/**
 * Check if marketing consent was granted.
 */
export const hasMarketingConsent = (): boolean => {
  const consent = getStoredConsent();
  return consent?.marketing || false;
};

const CookieConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = getStoredConsent();
    if (!existing) {
      // Delay appearance slightly for a less jarring experience
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = useCallback(() => {
    const consent: ConsentState = {
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    storeConsent(consent);
    setVisible(false);
  }, []);

  const handleAcceptSelected = useCallback(() => {
    const consent: ConsentState = {
      essential: true,
      analytics,
      marketing,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    storeConsent(consent);
    setVisible(false);
  }, [analytics, marketing]);

  const handleRejectAll = useCallback(() => {
    const consent: ConsentState = {
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    storeConsent(consent);
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="cookie-consent-banner"
      role="dialog"
      aria-label="Çerez onayı"
      aria-modal="false"
    >
      <div className="cookie-consent-content">
        <div className="cookie-consent-header">
          <Shield size={20} />
          <span>Gizlilik ve Çerez Politikası</span>
          <button
            className="cookie-consent-close"
            onClick={handleRejectAll}
            aria-label="Kapat"
            type="button"
          >
            <X size={16} />
          </button>
        </div>

        <p className="cookie-consent-text">
          ShareVibe, deneyiminizi iyileştirmek için çerezler kullanır. Zorunlu çerezler her zaman
          aktiftir. Analitik ve pazarlama çerezlerini tercihlerinize göre ayarlayabilirsiniz.
        </p>

        {showDetails && (
          <div className="cookie-consent-details">
            <label className="cookie-consent-option">
              <input type="checkbox" checked disabled />
              <div>
                <strong>Zorunlu Çerezler</strong>
                <small>Sitenin çalışması için gereklidir. Kapatılamaz.</small>
              </div>
            </label>
            <label className="cookie-consent-option">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
              />
              <div>
                <strong>Analitik Çerezler</strong>
                <small>Site kullanımını analiz etmemize yardımcı olur.</small>
              </div>
            </label>
            <label className="cookie-consent-option">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
              />
              <div>
                <strong>Pazarlama Çerezler</strong>
                <small>Kampanya ve reklam optimizasyonu için kullanılır.</small>
              </div>
            </label>
          </div>
        )}

        <div className="cookie-consent-actions">
          <button
            className="cookie-consent-btn cookie-consent-btn-secondary"
            onClick={() => setShowDetails(!showDetails)}
            type="button"
          >
            {showDetails ? 'Gizle' : 'Ayarları Yönet'}
          </button>
          {showDetails && (
            <button
              className="cookie-consent-btn cookie-consent-btn-secondary"
              onClick={handleAcceptSelected}
              type="button"
            >
              Seçilenleri Kabul Et
            </button>
          )}
          <button
            className="cookie-consent-btn cookie-consent-btn-reject"
            onClick={handleRejectAll}
            type="button"
          >
            Reddet
          </button>
          <button
            className="cookie-consent-btn cookie-consent-btn-primary"
            onClick={handleAcceptAll}
            type="button"
          >
            Tümünü Kabul Et
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
