import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

interface TurnstileWidgetProps {
  action: string;
  className?: string;
  onError: (error: string) => void;
  onReady: () => void;
  onReset: () => void;
  onTokenChange: (token: string) => void;
  siteKey: string;
}

export interface TurnstileWidgetHandle {
  reset: () => void;
}

interface TurnstileRenderOptions {
  "error-callback": () => void;
  "expired-callback": () => void;
  action: string;
  callback: (token: string) => void;
  sitekey: string;
  theme: "dark";
}

interface TurnstileApi {
  remove: (widgetId: string) => void;
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
}

const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-script";
const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let turnstileScriptPromise: Promise<void> | null = null;

const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  ({ action, className, onError, onReady, onReset, onTokenChange, siteKey }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);

    useImperativeHandle(ref, () => ({
      reset: () => {
        onReset();
        const widgetId = widgetIdRef.current;
        if (widgetId) {
          getTurnstileApi()?.reset(widgetId);
        }
      },
    }), [onReset]);

    useEffect(() => {
      if (!siteKey) {
        return;
      }

      let isActive = true;
      let renderedWidgetId: string | null = null;

      loadTurnstileScript()
        .then(() => {
          const turnstile = getTurnstileApi();
          if (!isActive || !turnstile || !containerRef.current) {
            return;
          }

          const widgetId = turnstile.render(containerRef.current, {
            "error-callback": () => {
              onError("Human verification failed to load. Refresh and try again.");
            },
            "expired-callback": () => {
              onReset();
              onError("Human verification expired. Complete the check again.");
            },
            action,
            callback: (token) => {
              onTokenChange(token);
            },
            sitekey: siteKey,
            theme: "dark",
          });

          widgetIdRef.current = widgetId;
          renderedWidgetId = widgetId;
          onReady();
        })
        .catch(() => {
          if (isActive) {
            onError("Human verification could not load. Refresh and try again.");
          }
        });

      return () => {
        isActive = false;
        const turnstile = getTurnstileApi();
        if (renderedWidgetId && turnstile) {
          turnstile.remove(renderedWidgetId);
        }
      };
    }, [action, onError, onReady, onReset, onTokenChange, siteKey]);

    return <div ref={containerRef} className={className} />;
  },
);

export default TurnstileWidget;

function loadTurnstileScript() {
  if (typeof window === "undefined" || getTurnstileApi()) {
    return Promise.resolve();
  }

  if (!turnstileScriptPromise) {
    turnstileScriptPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Turnstile failed to load.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.async = true;
      script.defer = true;
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = TURNSTILE_SCRIPT_SRC;
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => reject(new Error("Turnstile failed to load.")), { once: true });
      document.head.appendChild(script);
    });
  }

  return turnstileScriptPromise;
}

function getTurnstileApi() {
  return (window as Window & { turnstile?: TurnstileApi }).turnstile;
}
