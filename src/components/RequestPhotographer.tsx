import { useCallback, useReducer, useRef } from "react";
import { Building2, CheckCircle, Send, UserRound, X } from "lucide-react";
import TurnstileWidget, { type TurnstileWidgetHandle } from "@/components/TurnstileWidget";
import { fetchApi } from "@/lib/http";

type RequesterType = "organization" | "individual";
const TURNSTILE_ACTION = "photographer_request";

const requesterOptions: Array<{
  type: RequesterType;
  label: string;
  description: string;
  icon: typeof Building2;
}> = [
  {
    type: "organization",
    label: "Organization",
    description: "For clubs, departments, teams, and groups requesting coverage for an event or program.",
    icon: Building2,
  },
  {
    type: "individual",
    label: "Individual",
    description: "For portraits, personal events, small gatherings, and one-on-one photo requests.",
    icon: UserRound,
  },
];

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

interface RequestUiState {
  formUnlocked: boolean;
  phoneNumber: string;
  requesterType: RequesterType | null;
  serviceError: string;
  submitError: string;
  submitted: boolean;
  submitting: boolean;
  termsOpen: boolean;
  turnstileError: string;
  turnstileReady: boolean;
  turnstileToken: string;
}

type RequestUiAction =
  | { type: "patch"; value: Partial<RequestUiState> }
  | { type: "reset" };

const initialRequestUiState: RequestUiState = {
  formUnlocked: false,
  phoneNumber: "",
  requesterType: null,
  serviceError: "",
  submitError: "",
  submitted: false,
  submitting: false,
  termsOpen: false,
  turnstileError: "",
  turnstileReady: false,
  turnstileToken: "",
};

function requestUiReducer(state: RequestUiState, action: RequestUiAction): RequestUiState {
  switch (action.type) {
    case "patch":
      return { ...state, ...action.value };
    case "reset":
      return initialRequestUiState;
  }
}

interface RequestTheme {
  border: string;
  focusBorder: string;
  heading: string;
  inputText: string;
  mutedText: string;
  subText: string;
}

const requestTheme: RequestTheme = {
  border: "border-neutral-800",
  focusBorder: "focus:border-neutral-500",
  heading: "text-neutral-100",
  inputText: "text-neutral-200 placeholder-neutral-700",
  mutedText: "text-neutral-500",
  subText: "text-neutral-400",
};

interface RequestSubmittedProps {
  onReset: () => void;
  theme: RequestTheme;
}

function RequestSubmitted({ onReset, theme }: RequestSubmittedProps) {
  const { heading, mutedText, subText } = theme;

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-xl mx-auto">
        <CheckCircle size={48} className={`mx-auto mb-6 ${subText}`} strokeWidth={1} />
        <h2 className={`text-2xl tracking-wider mb-4 ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>Request Submitted</h2>
        <p className={`text-sm ${subText} tracking-wider leading-relaxed max-w-md mx-auto`}>We'll get back to you within 48 hours.</p>
        <p className={`text-xs ${mutedText} tracking-wider mt-8 mb-4`}>Need to submit another request?</p>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-11 items-center justify-center border border-neutral-800 px-5 py-3 text-xs uppercase tracking-[0.25em] text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400"
        >
          Submit Another Request
        </button>
      </div>
    </div>
  );
}

function RequestIntro({ theme }: { theme: RequestTheme }) {
  const { heading, mutedText, subText } = theme;

  return (
    <div className="text-center mb-12">
      <p className={`text-xs tracking-[0.4em] uppercase ${mutedText} mb-4`}>PPC Photographer Request</p>
      <h1 className={`text-4xl md:text-5xl tracking-wider ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>Request a Photographer</h1>
      <p className={`text-sm ${subText} tracking-wider mt-6 max-w-lg mx-auto leading-relaxed`}>
        Tell us what you need covered. We'll pass the request to club photographers; you confirm pay, timing, and deliverables with anyone who replies.
      </p>
    </div>
  );
}

interface RequesterTypeChooserProps {
  onOpenTerms: (type: RequesterType) => void;
  theme: RequestTheme;
}

function RequesterTypeChooser({ onOpenTerms, theme }: RequesterTypeChooserProps) {
  const { border, heading, mutedText, subText } = theme;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {requesterOptions.map((option) => {
        const Icon = option.icon;

        return (
          <button
            key={option.type}
            type="button"
            onClick={() => onOpenTerms(option.type)}
            className={`group min-h-64 border ${border} p-6 text-left transition-colors hover:border-neutral-500 focus:border-neutral-500 focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400`}
          >
            <Icon size={28} className={`${subText} mb-8 transition-colors group-hover:text-neutral-200`} strokeWidth={1.5} />
            <p className={`text-xs tracking-[0.35em] uppercase ${mutedText} mb-3`}>
              Requesting as
            </p>
            <h2 className={`text-2xl tracking-wider ${heading} mb-4`} style={{ fontFamily: "'Playfair Display', serif" }}>
              {option.label}
            </h2>
            <p className={`text-xs ${subText} tracking-wider leading-relaxed`}>
              {option.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}

interface RequestDetailsFormProps {
  formRef: React.RefObject<HTMLFormElement | null>;
  onChangeRequesterType: () => void;
  onClearServiceError: () => void;
  onPhoneNumberChange: (value: string) => void;
  onSubmit: () => void;
  onTurnstileError: (error: string) => void;
  onTurnstileReady: () => void;
  onTurnstileReset: () => void;
  onTurnstileTokenChange: (token: string) => void;
  phoneNumber: string;
  requesterType: RequesterType | null;
  selectedOption?: (typeof requesterOptions)[number];
  serviceError: string;
  submitError: string;
  submitting: boolean;
  theme: RequestTheme;
  turnstileError: string;
  turnstileReady: boolean;
  turnstileRef: React.RefObject<TurnstileWidgetHandle | null>;
  turnstileSiteKey: string;
  turnstileToken: string;
}

function RequestDetailsForm({
  formRef,
  onChangeRequesterType,
  onClearServiceError,
  onPhoneNumberChange,
  onSubmit,
  onTurnstileError,
  onTurnstileReady,
  onTurnstileReset,
  onTurnstileTokenChange,
  phoneNumber,
  requesterType,
  selectedOption,
  serviceError,
  submitError,
  submitting,
  theme,
  turnstileError,
  turnstileReady,
  turnstileRef,
  turnstileSiteKey,
  turnstileToken,
}: RequestDetailsFormProps) {
  const { border, focusBorder, heading, inputText, mutedText, subText } = theme;

  return (
    <form ref={formRef} className="space-y-6">
      <div className={`border ${border} px-4 py-3 flex items-center justify-between gap-4`}>
        <div>
          <p className={`text-[10px] tracking-[0.3em] uppercase ${mutedText}`}>Requester Type</p>
          <p className={`text-sm tracking-wider ${heading}`}>{selectedOption?.label}</p>
        </div>
        <button
          type="button"
          onClick={onChangeRequesterType}
          className={`min-h-11 text-[10px] tracking-[0.25em] uppercase ${mutedText} hover:text-neutral-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400 transition-colors`}
        >
          Change
        </button>
      </div>

      <input type="hidden" name="requesterType" value={requesterType ?? ""} />

      <div>
        <label htmlFor="RequestPhotographer-email" className={`block text-xs tracking-[0.2em] uppercase ${mutedText} mb-2`}>Email <span className="text-neutral-500">*</span></label>
        <input id="RequestPhotographer-email" type="email" name="email" placeholder="you@purdue.edu" required
          className={`w-full bg-transparent border ${border} px-4 py-3 text-sm tracking-wider ${inputText} ${focusBorder} focus:outline-none transition-colors`} />
      </div>
      <div>
        <label htmlFor="RequestPhotographer-phone-number" className={`block text-xs tracking-[0.2em] uppercase ${mutedText} mb-2`}>Phone Number
          <span className="ml-1 text-[10px] tracking-normal normal-case">(optional)</span> </label>
        <input id="RequestPhotographer-phone-number"
          type="tel"
          name="phoneNumber"
          value={phoneNumber}
          onChange={(e) => onPhoneNumberChange(e.target.value)}
          inputMode="numeric"
          autoComplete="tel"
          pattern="\([0-9]{3}\) [0-9]{3}-[0-9]{4}"
          maxLength={14}
          title="Enter a 10-digit phone number"
          placeholder="(765) 555-1234"
          className={`w-full bg-transparent border ${border} px-4 py-3 text-sm tracking-wider ${inputText} ${focusBorder} focus:outline-none transition-colors`} />
      </div>
      <div>
        <label htmlFor="RequestPhotographer-field-252" className={`block text-xs tracking-[0.2em] uppercase ${mutedText} mb-2`}>{selectedOption?.label === "Individual" ? "Your Name" : "Name of Organization"} <span className="text-neutral-500">*</span></label>
        <input id="RequestPhotographer-field-252" type="text" name="requesterName" placeholder="Your name, club, department, company, etc." required
          className={`w-full bg-transparent border ${border} px-4 py-3 text-sm tracking-wider ${inputText} ${focusBorder} focus:outline-none transition-colors`} />
      </div>
      <div>
        <label htmlFor="RequestPhotographer-location" className={`block text-xs tracking-[0.2em] uppercase ${mutedText} mb-2`}>Location <span className="text-neutral-500">*</span></label>
        <input id="RequestPhotographer-location" type="text" name="location" placeholder="Event location" required
          className={`w-full bg-transparent border ${border} px-4 py-3 text-sm tracking-wider ${inputText} ${focusBorder} focus:outline-none transition-colors`} />
      </div>
      <div>
        <label htmlFor="RequestPhotographer-type-of-event" className={`block text-xs tracking-[0.2em] uppercase ${mutedText} mb-2`}>Type of Event <span className="text-neutral-500">*</span></label>
        <select id="RequestPhotographer-type-of-event" name="eventType" required defaultValue=""
          className={`w-full bg-neutral-950 border ${border} px-4 py-3 text-sm tracking-wider ${inputText} ${focusBorder} focus:outline-none transition-colors`}>
          <option value="" disabled>Select an event type</option>
          <option value="graduation-pictures">Graduation Pictures</option>
          <option value="headshots">Headshots</option>
          <option value="wedding">Wedding</option>
          <option value="event-coverage">Event Coverage</option>
          <option value="portraits">Portraits</option>
          <option value="other">Other (leave in comments)</option>
        </select>
      </div>
      <fieldset>
        <legend className={`block text-xs tracking-[0.2em] uppercase ${mutedText} mb-2`}>Service Requested <span className="text-neutral-500">*</span></legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={`flex items-center gap-3 border ${border} px-4 py-3 text-sm tracking-wider ${subText} cursor-pointer transition-colors hover:border-neutral-500`}>
            <input type="checkbox" name="serviceType" value="photography" onChange={onClearServiceError} className="size-4 accent-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400" />
            Photography
          </label>
          <label className={`flex items-center gap-3 border ${border} px-4 py-3 text-sm tracking-wider ${subText} cursor-pointer transition-colors hover:border-neutral-500`}>
            <input type="checkbox" name="serviceType" value="videography" onChange={onClearServiceError} className="size-4 accent-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400" />
            Videography
          </label>
        </div>
        {serviceError && (
          <p className="mt-2 text-[10px] tracking-wider text-red-300">{serviceError}</p>
        )}
      </fieldset>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="RequestPhotographer-date" className={`block text-xs tracking-[0.2em] uppercase ${mutedText} mb-2`}>Date <span className="text-neutral-500">*</span></label>
          <input id="RequestPhotographer-date" type="date" name="eventDate" required
            className={`w-full bg-transparent border ${border} px-4 py-3 text-sm tracking-wider ${inputText} ${focusBorder} focus:outline-none transition-colors [color-scheme:dark]`} />
        </div>
        <div>
          <label htmlFor="RequestPhotographer-start-time" className={`block text-xs tracking-[0.2em] uppercase ${mutedText} mb-2`}>Start Time <span className="text-neutral-500">*</span></label>
          <input id="RequestPhotographer-start-time" type="time" name="startTime" required
            className={`w-full bg-transparent border ${border} px-4 py-3 text-sm tracking-wider ${inputText} ${focusBorder} focus:outline-none transition-colors [color-scheme:dark]`} />
        </div>
        <div>
          <label htmlFor="RequestPhotographer-end-time" className={`block text-xs tracking-[0.2em] uppercase ${mutedText} mb-2`}>End Time <span className="text-neutral-500">*</span></label>
          <input id="RequestPhotographer-end-time" type="time" name="endTime" required
            className={`w-full bg-transparent border ${border} px-4 py-3 text-sm tracking-wider ${inputText} ${focusBorder} focus:outline-none transition-colors [color-scheme:dark]`} />
        </div>
      </div>
      <div>
        <label htmlFor="RequestPhotographer-payment-amount" className={`block text-xs tracking-[0.2em] uppercase ${mutedText} mb-2`}>Payment Amount <span className="text-neutral-500">*</span></label>
        <input id="RequestPhotographer-payment-amount" type="text" name="paymentAmount" placeholder="Budget, rate, volunteer, or negotiable" required
          className={`w-full bg-transparent border ${border} px-4 py-3 text-sm tracking-wider ${inputText} ${focusBorder} focus:outline-none transition-colors`} />
      </div>
      <div>
        <label htmlFor="RequestPhotographer-contact-information" className={`block text-xs tracking-[0.2em] uppercase ${mutedText} mb-2`}>Contact Information <span className="text-neutral-500">*</span></label>
        <p className={`text-[10px] ${mutedText} tracking-wider mb-3 leading-relaxed`}>
          Add a preferred contact method or backup contact for photographers who reply.
        </p>
        <textarea id="RequestPhotographer-contact-information" rows={3} name="contactInformation" required placeholder="Email, social media, preferred contact method, etc."
          className={`w-full bg-transparent border ${border} px-4 py-3 text-sm tracking-wider ${inputText} ${focusBorder} focus:outline-none transition-colors resize-none`} />
      </div>
      <div>
        <label htmlFor="RequestPhotographer-comments" className={`block text-xs tracking-[0.2em] uppercase ${mutedText} mb-2`}>Comments</label>
        <textarea id="RequestPhotographer-comments" rows={4} name="comments" placeholder="Anything photographers should know about the event, deliverables, access, or expectations."
          className={`w-full bg-transparent border ${border} px-4 py-3 text-sm tracking-wider ${inputText} ${focusBorder} focus:outline-none transition-colors resize-none`} />
      </div>
      <div className="min-h-[65px]">
        {turnstileSiteKey ? (
          <TurnstileWidget
            ref={turnstileRef}
            action={TURNSTILE_ACTION}
            className="flex justify-center"
            onError={onTurnstileError}
            onReady={onTurnstileReady}
            onReset={onTurnstileReset}
            onTokenChange={onTurnstileTokenChange}
            siteKey={turnstileSiteKey}
          />
        ) : (
          <p className="border border-red-900/50 bg-red-950/20 px-4 py-3 text-xs leading-5 tracking-wider text-red-300">
            Human verification is temporarily unavailable.
          </p>
        )}
        {turnstileError && (
          <p className="mt-3 border border-red-900/50 bg-red-950/20 px-4 py-3 text-xs leading-5 tracking-wider text-red-300">{turnstileError}</p>
        )}
      </div>
      {submitError && (
        <p className="text-xs tracking-wider text-red-300">{submitError}</p>
      )}
      <button type="button" onClick={onSubmit} disabled={submitting || !turnstileSiteKey || !turnstileReady || !turnstileToken}
        className="w-full flex min-h-12 items-center justify-center gap-3 py-4 text-xs tracking-[0.3em] uppercase transition-colors bg-white text-black hover:bg-neutral-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-500">
        <Send size={14} /> {submitting ? "Submitting" : "Submit Request"}
      </button>
    </form>
  );
}

interface RequestTermsDialogProps {
  onAgree: () => void;
  onClose: () => void;
  theme: RequestTheme;
}

function RequestTermsDialog({ onAgree, onClose, theme }: RequestTermsDialogProps) {
  const { border, heading, mutedText, subText } = theme;

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby="request-terms-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="fixed inset-0 z-[120] m-0 flex h-dvh max-h-none w-dvw max-w-none items-center justify-center bg-black/80 px-6 py-8 backdrop:bg-transparent"
    >
      <div className={`w-full max-w-xl border ${border} bg-neutral-950 p-6 shadow-2xl`}>
        <div className="flex items-start justify-between gap-6 mb-6">
          <div>
            <p className={`text-[10px] tracking-[0.35em] uppercase ${mutedText} mb-2`}>Before You Continue</p>
            <h2 id="request-terms-title" className={`text-2xl tracking-wider ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>
              Request Terms
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close request terms"
            className={`flex min-h-11 min-w-11 items-center justify-center ${subText} hover:text-neutral-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400 transition-colors`}
          >
            <X size={20} />
          </button>
        </div>

        <div className={`space-y-4 text-xs ${subText} tracking-wider leading-relaxed`}>
          <p>
            PPC shares your request with available club photographers. We cannot guarantee coverage, and photographers who reply work with you directly.
          </p>
          <p>
            Confirm payment, arrival time, deliverables, permissions, access, and event rules with the photographer before the event.
          </p>
          <p>
            Include only contact details you are comfortable sharing with interested photographers.
          </p>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`min-h-11 border ${border} px-5 py-3 text-xs tracking-[0.25em] uppercase ${subText} hover:border-neutral-500 hover:text-neutral-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400 transition-colors`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onAgree}
            className="min-h-11 bg-white px-5 py-3 text-xs tracking-[0.25em] uppercase text-black transition-colors hover:bg-neutral-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400"
          >
            I Agree
          </button>
        </div>
      </div>
    </dialog>
  );
}

interface RequestPhotographerProps {
  turnstileSiteKey: string;
}

const resetTurnstilePatch = {
  turnstileError: "",
  turnstileReady: false,
  turnstileToken: "",
};

export default function RequestPhotographer({ turnstileSiteKey }: RequestPhotographerProps) {
  const [uiState, dispatch] = useReducer(requestUiReducer, initialRequestUiState);
  const formRef = useRef<HTMLFormElement>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);
  const {
    formUnlocked,
    phoneNumber,
    requesterType,
    serviceError,
    submitError,
    submitted,
    submitting,
    termsOpen,
    turnstileError,
    turnstileReady,
    turnstileToken,
  } = uiState;

  const resetTurnstile = useCallback(() => {
    dispatch({ type: "patch", value: { turnstileToken: "" } });
    turnstileRef.current?.reset();
  }, []);

  const handleTurnstileError = useCallback((error: string) => {
    dispatch({ type: "patch", value: { turnstileError: error, turnstileToken: "" } });
  }, []);

  const handleTurnstileReady = useCallback(() => {
    dispatch({ type: "patch", value: { turnstileReady: true } });
  }, []);

  const handleTurnstileReset = useCallback(() => {
    dispatch({ type: "patch", value: { turnstileToken: "" } });
  }, []);

  const handleTurnstileTokenChange = useCallback((token: string) => {
    dispatch({ type: "patch", value: { turnstileError: "", turnstileToken: token } });
  }, []);

  const resetRequest = () => {
    dispatch({ type: "reset" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (submitted) {
    return <RequestSubmitted onReset={resetRequest} theme={requestTheme} />;
  }

  const openTerms = (type: RequesterType) => {
    dispatch({ type: "patch", value: { formUnlocked: false, requesterType: type, termsOpen: true, ...resetTurnstilePatch } });
  };

  const closeTerms = () => {
    dispatch({
      type: "patch",
      value: {
        requesterType: formUnlocked ? requesterType : null,
        termsOpen: false,
      },
    });
  };

  const agreeToTerms = () => {
    dispatch({ type: "patch", value: { formUnlocked: true, termsOpen: false } });
  };

  const selectedOption = requesterOptions.find((option) => option.type === requesterType);

  const submitRequest = async () => {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return;

    const formData = new FormData(form);
    const selectedServiceTypes = formData.getAll("serviceType").map((value) => String(value));

    if (!selectedServiceTypes.length) {
      dispatch({ type: "patch", value: { serviceError: "Select photography, videography, or both." } });
      return;
    }

    if (!requesterType) {
      dispatch({ type: "patch", value: { submitError: "Please choose organization or individual first." } });
      return;
    }

    if (!turnstileSiteKey) {
      dispatch({ type: "patch", value: { submitError: "Human verification is temporarily unavailable." } });
      return;
    }

    if (!turnstileToken) {
      dispatch({ type: "patch", value: { submitError: "Complete the human verification check before submitting your request." } });
      return;
    }

    dispatch({ type: "patch", value: { serviceError: "", submitError: "", submitting: true } });

    try {
      const response = await fetchApi("/api/photographer-requests", {
        body: JSON.stringify({
          comments: String(formData.get("comments") || ""),
          contactInformation: String(formData.get("contactInformation") || ""),
          email: String(formData.get("email") || ""),
          endTime: String(formData.get("endTime") || ""),
          eventDate: String(formData.get("eventDate") || ""),
          eventType: String(formData.get("eventType") || ""),
          location: String(formData.get("location") || ""),
          paymentAmount: String(formData.get("paymentAmount") || ""),
          phoneNumber,
          requesterName: String(formData.get("requesterName") || ""),
          requesterType,
          serviceTypes: selectedServiceTypes,
          startTime: String(formData.get("startTime") || ""),
          turnstileToken,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        dispatch({ type: "patch", value: { submitError: data?.error || "Failed to submit photographer request." } });
        resetTurnstile();
        return;
      }

      dispatch({ type: "patch", value: { submitted: true } });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      dispatch({ type: "patch", value: { submitError: "Failed to submit photographer request. Please try again." } });
      resetTurnstile();
    } finally {
      dispatch({ type: "patch", value: { submitting: false } });
    }
  };

  return (
    <div className="min-h-screen px-6 py-24">
      <div className="max-w-2xl mx-auto">
        <RequestIntro theme={requestTheme} />
        {!formUnlocked ? (
          <RequesterTypeChooser onOpenTerms={openTerms} theme={requestTheme} />
        ) : (
          <RequestDetailsForm
            formRef={formRef}
            onChangeRequesterType={() => dispatch({ type: "patch", value: { formUnlocked: false, requesterType: null, ...resetTurnstilePatch } })}
            onClearServiceError={() => dispatch({ type: "patch", value: { serviceError: "" } })}
            onPhoneNumberChange={(value) => dispatch({ type: "patch", value: { phoneNumber: formatPhoneNumber(value) } })}
            onSubmit={() => void submitRequest()}
            onTurnstileError={handleTurnstileError}
            onTurnstileReady={handleTurnstileReady}
            onTurnstileReset={handleTurnstileReset}
            onTurnstileTokenChange={handleTurnstileTokenChange}
            phoneNumber={phoneNumber}
            requesterType={requesterType}
            selectedOption={selectedOption}
            serviceError={serviceError}
            submitError={submitError}
            submitting={submitting}
            theme={requestTheme}
            turnstileError={turnstileError}
            turnstileReady={turnstileReady}
            turnstileRef={turnstileRef}
            turnstileSiteKey={turnstileSiteKey}
            turnstileToken={turnstileToken}
          />
        )}
      </div>

      {termsOpen && (
        <RequestTermsDialog
          onAgree={agreeToTerms}
          onClose={closeTerms}
          theme={requestTheme}
        />
      )}
    </div>
  );
}
