import { useState, useEffect } from "react";
import { Cookie } from "lucide-react";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setVisible(false);
  };

  const handleDeny = () => {
    localStorage.setItem("cookie-consent", "denied");
    setVisible(false);
  };

  return (
    <div
      data-floating-widget
      className={`fixed bottom-4 left-4 z-[100] transition-all duration-500 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"
      }`}
    >
      <div className="rounded border border-neutral-800/60 bg-neutral-900/90 backdrop-blur-sm px-4 py-3 shadow-lg max-w-xs">
        <div className="flex items-start gap-3">
          <Cookie className="size-3.5 shrink-0 text-neutral-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-[10px] leading-relaxed tracking-wide text-neutral-400 mb-2" style={{ fontFamily: "'Space Mono', monospace" }}>
              We use cookies to remember your preferences and improve your experience. No personal data is sold or shared.
            </p>
          <div className="flex items-center gap-2">
            <button type="button"
              onClick={handleAccept}
              className="flex min-h-11 items-center px-2 text-[9px] uppercase tracking-[0.15em] text-neutral-300 transition-colors hover:text-neutral-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400 cursor-pointer"
            >
              Accept
            </button>
            <span className="text-neutral-700">|</span>
            <button type="button"
              onClick={handleDeny}
              className="flex min-h-11 items-center px-2 text-[9px] uppercase tracking-[0.15em] text-neutral-600 transition-colors hover:text-neutral-400 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400 cursor-pointer"
            >
              Deny
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
