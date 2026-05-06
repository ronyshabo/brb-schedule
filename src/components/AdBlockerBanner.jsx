import { useState, useEffect } from 'react'

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true // iOS Safari

export default function AdBlockerBanner() {
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    // Already installed as a PWA — no banner needed
    if (isStandalone()) return

    // Dismissed this session already
    if (sessionStorage.getItem('brb-adblock-dismissed')) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(ios)

    // Try to reach Firestore; if blocked by ad blocker, show banner
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    fetch('https://firestore.googleapis.com/', {
      mode: 'no-cors',
      signal: controller.signal,
    })
      .then(() => clearTimeout(timer))
      .catch(() => {
        clearTimeout(timer)
        setShow(true)
      })

    // Android Chrome "Add to Home Screen" prompt
    const handleInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
  }, [])

  const dismiss = () => {
    sessionStorage.setItem('brb-adblock-dismissed', '1')
    setShow(false)
  }

  const installApp = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShow(false)
    setDeferredPrompt(null)
  }

  if (!show) return null

  return (
    <div className="adblock-banner" role="alert">
      <span className="adblock-banner__icon">⚠️</span>
      <div className="adblock-banner__body">
        <strong>Ad blocker detected</strong>
        <p>
          {isIOS
            ? 'Your ad blocker is preventing the app from loading. Tap the Share button (□↑) in Safari → "Add to Home Screen". Opening from your home screen fixes this.'
            : deferredPrompt
            ? 'Your ad blocker is blocking the app database. Install the app to your home screen to fix this instantly.'
            : 'Your ad blocker is blocking this app. Please disable it for this site, or add this page to your home screen.'}
        </p>
      </div>
      {deferredPrompt && (
        <button className="adblock-banner__install" onClick={installApp}>
          Install App
        </button>
      )}
      <button className="adblock-banner__close" onClick={dismiss} aria-label="Dismiss warning">
        ×
      </button>
    </div>
  )
}
