import { useCallback, useReducer, useRef, type FormEvent } from "react";
import { CheckCircle, Send } from "lucide-react";
import TurnstileWidget, {
  type TurnstileWidgetHandle,
} from "@/components/TurnstileWidget";
import { fetchApi, readErrorMessage } from "@/lib/http";

const TURNSTILE_ACTION = "member_report";
const REPORTED_NAME_MIN_LENGTH = 2;
const REPORTED_NAME_MAX_LENGTH = 120;
const BEHAVIOR_MIN_LENGTH = 20;
const BEHAVIOR_MAX_LENGTH = 2000;
const REASON_MAX_LENGTH = 500;
const REASON_HTML_MAX_LENGTH = REASON_MAX_LENGTH * 2;

interface MemberReportFormProps {
  turnstileSiteKey: string;
}

interface MemberReportState {
  behavior: string;
  error: string;
  reason: string;
  reportedName: string;
  submitted: boolean;
  submitting: boolean;
  turnstileError: string;
  turnstileReady: boolean;
  turnstileToken: string;
}

type MemberReportAction =
  | { type: "patch"; value: Partial<MemberReportState> }
  | { type: "reset" };

const initialMemberReportState: MemberReportState = {
  behavior: "",
  error: "",
  reason: "",
  reportedName: "",
  submitted: false,
  submitting: false,
  turnstileError: "",
  turnstileReady: false,
  turnstileToken: "",
};

function memberReportReducer(
  state: MemberReportState,
  action: MemberReportAction,
): MemberReportState {
  switch (action.type) {
    case "patch":
      return { ...state, ...action.value };
    case "reset":
      return initialMemberReportState;
  }
}

export function unicodeLength(value: string): number {
  return Array.from(value).length;
}

export function limitUnicodeLength(value: string, maximum: number): string {
  return Array.from(value).slice(0, maximum).join("");
}

export function normalizeMemberReportReason(value: string): string {
  return value.trim();
}

function MemberReportSubmitted({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-24">
      <div className="mx-auto max-w-xl text-center">
        <CheckCircle
          aria-hidden="true"
          className="mx-auto mb-6 text-neutral-300"
          size={48}
          strokeWidth={1}
        />
        <h1
          className="text-3xl tracking-wider text-neutral-100"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Report Submitted
        </h1>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed tracking-wider text-neutral-400">
          Your report was sent to club officers for review.
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-8 inline-flex min-h-11 items-center justify-center border border-neutral-800 px-5 py-3 text-xs uppercase tracking-[0.22em] text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400"
        >
          Submit Another Report
        </button>
      </div>
    </div>
  );
}

function MemberReportIntroduction() {
  return (
    <div className="mb-12 text-center">
      <p className="mb-4 text-xs uppercase tracking-[0.4em] text-neutral-500">
        Anonymous Reporting
      </p>
      <h1
        className="text-4xl tracking-wider text-neutral-100 md:text-5xl"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Report a Concern
      </h1>
      <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed tracking-wider text-neutral-400">
        Share a concern about a member&apos;s behavior with the Executive team.
        No sign-in or contact information is required.
      </p>
    </div>
  );
}

function MemberReportReasonField({
  onChange,
  reason,
}: {
  onChange: (reason: string) => void;
  reason: string;
}) {
  return (
    <div>
      <label
        htmlFor="MemberReport-reason"
        className="mb-2 block text-xs uppercase tracking-[0.2em] text-neutral-400"
      >
        Reason for Report{" "}
        <span className="text-neutral-500">(Optional)</span>
      </label>
      <p
        id="member-report-reason-help"
        className="mb-3 text-[11px] leading-relaxed tracking-wider text-neutral-400"
      >
        Explain why this behavior concerns you. Leave this blank if the behavior
        description already covers it.
      </p>
      <textarea
        id="MemberReport-reason"
        value={reason}
        onChange={(event) =>
          onChange(limitUnicodeLength(event.target.value, REASON_MAX_LENGTH))
        }
        autoComplete="off"
        maxLength={REASON_HTML_MAX_LENGTH}
        rows={5}
        aria-describedby="member-report-reason-help member-report-reason-count"
        placeholder="Why does this behavior concern you?"
        className="w-full resize-y border border-neutral-800 bg-transparent px-4 py-3 text-sm leading-relaxed tracking-wider text-neutral-100 placeholder-neutral-500 transition-colors focus:border-neutral-500 focus:outline-none"
      />
      <p
        id="member-report-reason-count"
        className="mt-2 text-right text-[10px] tracking-wider text-neutral-500"
      >
        {unicodeLength(reason)} / {REASON_MAX_LENGTH}
      </p>
    </div>
  );
}

export default function MemberReportForm({
  turnstileSiteKey,
}: MemberReportFormProps) {
  const [state, dispatch] = useReducer(
    memberReportReducer,
    initialMemberReportState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);

  const resetTurnstile = useCallback(() => {
    dispatch({ type: "patch", value: { turnstileToken: "" } });
    turnstileRef.current?.reset();
  }, []);

  const handleTurnstileError = useCallback((error: string) => {
    dispatch({
      type: "patch",
      value: { turnstileError: error, turnstileToken: "" },
    });
  }, []);

  const handleTurnstileReady = useCallback(() => {
    dispatch({ type: "patch", value: { turnstileReady: true } });
  }, []);

  const handleTurnstileReset = useCallback(() => {
    dispatch({ type: "patch", value: { turnstileToken: "" } });
  }, []);

  const handleTurnstileTokenChange = useCallback((token: string) => {
    dispatch({
      type: "patch",
      value: { turnstileError: "", turnstileToken: token },
    });
  }, []);

  const submitReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = formRef.current;
    if (!form || !form.reportValidity()) {
      return;
    }

    const reportedName = state.reportedName.trim();
    const behavior = state.behavior.trim();
    const reason = normalizeMemberReportReason(state.reason);

    if (
      reportedName.length < REPORTED_NAME_MIN_LENGTH ||
      behavior.length < BEHAVIOR_MIN_LENGTH
    ) {
      dispatch({
        type: "patch",
        value: {
          error:
            "Enter the member's name and at least 20 characters describing the behavior.",
        },
      });
      return;
    }

    if (unicodeLength(reason) > REASON_MAX_LENGTH) {
      dispatch({
        type: "patch",
        value: {
          error: "Keep the optional reason to 500 characters or fewer.",
        },
      });
      return;
    }

    if (!turnstileSiteKey) {
      dispatch({
        type: "patch",
        value: { error: "Human verification is temporarily unavailable." },
      });
      return;
    }

    if (!state.turnstileToken) {
      dispatch({
        type: "patch",
        value: {
          error:
            "Complete the human verification check before submitting your report.",
        },
      });
      return;
    }

    dispatch({
      type: "patch",
      value: { error: "", submitting: true },
    });

    const turnstileToken = state.turnstileToken;

    try {
      const response = await fetchApi("/api/member-reports", {
        body: JSON.stringify({
          behavior,
          reason,
          reportedName,
          turnstileToken,
        }),
        credentials: "omit",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        dispatch({
          type: "patch",
          value: {
            error: await readErrorMessage(
              response,
              "Your report could not be submitted. Please try again.",
            ),
          },
        });
        resetTurnstile();
        return;
      }

      dispatch({ type: "patch", value: { submitted: true } });
      window.scrollTo({ top: 0 });
    } catch {
      dispatch({
        type: "patch",
        value: {
          error: "Your report could not be submitted. Please try again.",
        },
      });
      resetTurnstile();
    } finally {
      dispatch({ type: "patch", value: { submitting: false } });
    }
  };

  if (state.submitted) {
    return (
      <MemberReportSubmitted
        onReset={() => {
          dispatch({ type: "reset" });
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  const submitDisabled =
    state.submitting ||
    !turnstileSiteKey ||
    !state.turnstileReady ||
    !state.turnstileToken;

  return (
    <div className="min-h-screen px-6 py-24">
      <div className="mx-auto max-w-2xl">
        <MemberReportIntroduction />

        <form
          ref={formRef}
          action="/report"
          method="post"
          onSubmit={(event) => void submitReport(event)}
          className="space-y-6"
        >
          <div>
            <label
              htmlFor="MemberReport-reported-name"
              className="mb-2 block text-xs uppercase tracking-[0.2em] text-neutral-400"
            >
              Reported Member&apos;s Name{" "}
              <span className="text-neutral-500">*</span>
            </label>
            <p className="mb-3 text-[11px] leading-relaxed tracking-wider text-neutral-400">
              Use their full name, display name, or Discord name.
            </p>
            <input
              id="MemberReport-reported-name"
              type="text"
              value={state.reportedName}
              onChange={(event) =>
                dispatch({
                  type: "patch",
                  value: { error: "", reportedName: event.target.value },
                })
              }
              autoComplete="off"
              minLength={REPORTED_NAME_MIN_LENGTH}
              maxLength={REPORTED_NAME_MAX_LENGTH}
              required
              placeholder="Member name"
              className="w-full border border-neutral-800 bg-transparent px-4 py-3 text-sm tracking-wider text-neutral-100 placeholder-neutral-500 transition-colors focus:border-neutral-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="MemberReport-behavior"
              className="mb-2 block text-xs uppercase tracking-[0.2em] text-neutral-400"
            >
              Behavior You Are Reporting{" "}
              <span className="text-neutral-500">*</span>
            </label>
            <p className="mb-3 text-[11px] leading-relaxed tracking-wider text-neutral-400">
              Describe what happened, including when or where if that helps
              officers understand the concern.
            </p>
            <textarea
              id="MemberReport-behavior"
              value={state.behavior}
              onChange={(event) =>
                dispatch({
                  type: "patch",
                  value: { behavior: event.target.value, error: "" },
                })
              }
              autoComplete="off"
              minLength={BEHAVIOR_MIN_LENGTH}
              maxLength={BEHAVIOR_MAX_LENGTH}
              required
              rows={9}
              aria-describedby="member-report-behavior-count"
              placeholder="Describe what happened."
              className="w-full resize-y border border-neutral-800 bg-transparent px-4 py-3 text-sm leading-relaxed tracking-wider text-neutral-100 placeholder-neutral-500 transition-colors focus:border-neutral-500 focus:outline-none"
            />
            <p
              id="member-report-behavior-count"
              className="mt-2 text-right text-[10px] tracking-wider text-neutral-500"
            >
              {state.behavior.length} / {BEHAVIOR_MAX_LENGTH}
            </p>
          </div>

          <MemberReportReasonField
            reason={state.reason}
            onChange={(reason) =>
              dispatch({
                type: "patch",
                value: { error: "", reason },
              })
            }
          />

          <div className="min-h-[65px]">
            {turnstileSiteKey ? (
              <TurnstileWidget
                ref={turnstileRef}
                action={TURNSTILE_ACTION}
                className="flex justify-center"
                onError={handleTurnstileError}
                onReady={handleTurnstileReady}
                onReset={handleTurnstileReset}
                onTokenChange={handleTurnstileTokenChange}
                siteKey={turnstileSiteKey}
              />
            ) : (
              <p className="border border-red-900/50 bg-red-950/20 px-4 py-3 text-xs leading-5 tracking-wider text-red-300">
                Human verification is temporarily unavailable.
              </p>
            )}
            {state.turnstileError && (
              <p
                role="alert"
                className="mt-3 border border-red-900/50 bg-red-950/20 px-4 py-3 text-xs leading-5 tracking-wider text-red-300"
              >
                {state.turnstileError}
              </p>
            )}
          </div>

          {state.error && (
            <p role="alert" className="text-xs leading-relaxed tracking-wider text-red-300">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitDisabled}
            className="flex min-h-12 w-full items-center justify-center gap-3 bg-white px-5 py-4 text-xs uppercase tracking-[0.28em] text-black transition-colors hover:bg-neutral-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-500"
          >
            <Send aria-hidden="true" size={14} />
            {state.submitting ? "Submitting" : "Submit Report"}
          </button>
        </form>
      </div>
    </div>
  );
}
