import { DateTime } from "luxon";
import { useEffect, useMemo, useRef, useState } from "react";
import { createApiClient } from "./api.js";
import { buildMonthGrid } from "./calendar-utils.js";
import { defaultFormatLocale, resolveLabels } from "./locales/index.js";
import { loadTurnstileScript } from "./turnstile.js";
import type { BookingWidgetProps, ServiceType, Slot } from "./types.js";
import "./widget.css";

type Step = "service" | "datetime" | "details" | "success";

export function BookingWidget({
  apiUrl,
  apiKey,
  resourceId,
  lang = "en",
  labels: labelOverrides,
  formatLocale,
  turnstileSiteKey,
  onBooked,
  clientLibrary = "react",
}: BookingWidgetProps) {
  const labels = useMemo(() => resolveLabels(lang, labelOverrides), [lang, labelOverrides]);
  const api = useMemo(() => createApiClient(apiUrl, apiKey, clientLibrary), [apiUrl, apiKey, clientLibrary]);
  const locale = formatLocale ?? defaultFormatLocale(lang);
  const browserTz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

  const [step, setStep] = useState<Step>("datetime");
  const [serviceTypes, setServiceTypes] = useState<ServiceType[] | null>(null);
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string | undefined>(undefined);

  const [tz, setTz] = useState(browserTz);
  const [visibleMonth, setVisibleMonth] = useState(() => DateTime.now().setZone(browserTz).startOf("month"));
  const [monthSlots, setMonthSlots] = useState<Slot[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Rendered fresh each time the details step is entered (and torn down on
  // the way out) rather than once for the widget's whole lifetime, a
  // Turnstile challenge is meant to be solved right before submitting, not
  // sitting stale in the background for a form the customer hasn't reached
  // yet. No-ops entirely when turnstileSiteKey isn't set.
  useEffect(() => {
    if (!turnstileSiteKey || step !== "details") return;
    let cancelled = false;
    loadTurnstileScript().then(() => {
      if (cancelled || !turnstileContainerRef.current || !window.turnstile) return;
      turnstileWidgetId.current = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: turnstileSiteKey,
        callback: (token: string) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(null),
      });
    });
    return () => {
      cancelled = true;
      if (turnstileWidgetId.current && window.turnstile) {
        window.turnstile.remove(turnstileWidgetId.current);
        turnstileWidgetId.current = null;
      }
      setTurnstileToken(null);
    };
  }, [turnstileSiteKey, step]);

  // Step 0: figure out whether a service picker is even needed.
  useEffect(() => {
    api
      .fetchServiceTypes(resourceId)
      .then((types) => {
        setServiceTypes(types);
        if (types.length >= 2) {
          setStep("service");
        } else {
          setSelectedServiceTypeId(types[0]?.id);
          setStep("datetime");
        }
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)));
  }, [api, resourceId]);

  // Fetch availability for the whole visible month whenever it (or the
  // selected service) changes.
  useEffect(() => {
    if (step !== "datetime") return;
    setMonthSlots(null);
    setSelectedDate(null);
    const from = visibleMonth.startOf("month").toISODate()!;
    const to = visibleMonth.endOf("month").toISODate()!;
    api
      .fetchAvailability(from, to, { resourceId, serviceTypeId: selectedServiceTypeId })
      .then((res) => {
        setTz(res.timezone);
        setMonthSlots(res.slots);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)));
  }, [api, resourceId, selectedServiceTypeId, step, visibleMonth]);

  const slotsByDate = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const slot of monthSlots ?? []) {
      const d = DateTime.fromISO(slot.startAt, { zone: tz }).toISODate()!;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(slot);
    }
    return map;
  }, [monthSlots, tz]);

  const calendarDays = useMemo(() => buildMonthGrid(visibleMonth, tz), [visibleMonth, tz]);
  const monthHasAnyAvailability = slotsByDate.size > 0;

  // Back to a clean slate for a second booking in the same widget instance,
  // without a full page reload, re-enters at the service picker if there
  // is one, otherwise straight to the calendar (mirrors the initial-load
  // logic in the service-types effect above).
  function resetForNewBooking() {
    setStep(serviceTypes && serviceTypes.length >= 2 ? "service" : "datetime");
    setSelectedServiceTypeId(serviceTypes && serviceTypes.length >= 2 ? undefined : serviceTypes?.[0]?.id);
    setVisibleMonth(DateTime.now().setZone(tz).startOf("month"));
    setSelectedDate(null);
    setSelectedSlot(null);
    setMonthSlots(null);
    setName("");
    setEmail("");
    setPhone("");
    setNotes("");
    setSubmitError(null);
    setTurnstileToken(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const booking = await api.createBooking({
        resourceId,
        serviceTypeId: selectedServiceTypeId,
        startAt: selectedSlot.startAt,
        customerName: name,
        customerEmail: email,
        customerPhone: phone || undefined,
        notes: notes || undefined,
        lang,
        turnstileToken: turnstileToken ?? undefined,
      });
      setStep("success");
      onBooked?.(booking);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : labels.genericError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pbw-root">
      <div className="pbw-card">
        {loadError && <p className="pbw-alert-error">{loadError}</p>}

        {!loadError && step === "service" && serviceTypes && (
          <>
            <p className="pbw-title">{labels.chooseService}</p>
            <div className="pbw-service-list">
              {serviceTypes.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  className="pbw-service-option"
                  onClick={() => {
                    setSelectedServiceTypeId(st.id);
                    setStep("datetime");
                  }}
                >
                  {st.name}
                </button>
              ))}
            </div>
          </>
        )}

        {!loadError && step === "datetime" && (
          <>
            {serviceTypes && serviceTypes.length >= 2 && (
              <button type="button" className="pbw-back" onClick={() => setStep("service")}>
                ← {labels.changeService}
              </button>
            )}
            <div className="pbw-datetime">
              <div>
                <div className="pbw-calendar-nav">
                  <button
                    type="button"
                    className="pbw-calendar-nav-btn"
                    disabled={visibleMonth <= DateTime.now().setZone(tz).startOf("month")}
                    onClick={() => setVisibleMonth((m) => m.minus({ months: 1 }))}
                    aria-label="Previous month"
                  >
                    ‹
                  </button>
                  <span className="pbw-calendar-nav-label">
                    {labels.monthNames[visibleMonth.month - 1]} {visibleMonth.year}
                  </span>
                  <button
                    type="button"
                    className="pbw-calendar-nav-btn"
                    onClick={() => setVisibleMonth((m) => m.plus({ months: 1 }))}
                    aria-label="Next month"
                  >
                    ›
                  </button>
                </div>
                <div className="pbw-calendar-grid">
                  {labels.dayNamesShort.map((d) => (
                    <div key={d} className="pbw-calendar-daylabel">
                      {d}
                    </div>
                  ))}
                  {calendarDays.map((day) => {
                    const hasSlots = (slotsByDate.get(day.iso)?.length ?? 0) > 0;
                    const disabled = !day.inCurrentMonth || day.isPast || (monthSlots !== null && !hasSlots);
                    return (
                      <button
                        key={day.iso}
                        type="button"
                        disabled={disabled}
                        onClick={() => setSelectedDate(day.iso)}
                        className={[
                          "pbw-calendar-day",
                          !day.inCurrentMonth && "pbw-calendar-day--other-month",
                          day.isToday && "pbw-calendar-day--today",
                          selectedDate === day.iso && "pbw-calendar-day--selected",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {day.date.day}
                      </button>
                    );
                  })}
                </div>
                {monthSlots !== null && !monthHasAnyAvailability && (
                  <p className="pbw-empty">{labels.noAvailability}</p>
                )}
              </div>

              <div>
                {selectedDate && (
                  <>
                    <p className="pbw-timeslots-heading">
                      {labels.selectedDatePrefix}{" "}
                      {DateTime.fromISO(selectedDate, { zone: tz }).toLocaleString(
                        { weekday: "long", month: "long", day: "numeric" },
                        { locale },
                      )}
                    </p>
                    <div className="pbw-timeslot-list">
                      {(slotsByDate.get(selectedDate) ?? []).map((slot) => (
                        <button
                          key={slot.startAt}
                          type="button"
                          className="pbw-timeslot-button"
                          onClick={() => {
                            setSelectedSlot(slot);
                            setStep("details");
                          }}
                        >
                          {DateTime.fromISO(slot.startAt, { zone: tz }).toLocaleString(
                            { hour: "numeric", minute: "2-digit" },
                            { locale },
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {step === "details" && selectedSlot && (
          <>
            <button
              type="button"
              className="pbw-back"
              onClick={() => {
                setStep("datetime");
                setSelectedSlot(null);
                setSubmitError(null);
              }}
            >
              ← {labels.back}
            </button>
            <div className="pbw-selected-slot" style={{ marginBottom: "var(--pbw-space-4)" }}>
              <strong>
                {DateTime.fromISO(selectedSlot.startAt, { zone: tz }).toLocaleString(
                  { weekday: "long", month: "long", day: "numeric" },
                  { locale },
                )}
              </strong>{" "}
              ·{" "}
              {DateTime.fromISO(selectedSlot.startAt, { zone: tz }).toLocaleString(
                { hour: "numeric", minute: "2-digit" },
                { locale },
              )}
            </div>
            <form className="pbw-form" onSubmit={handleSubmit}>
              <div className="pbw-field">
                <label htmlFor="pbw-name">{labels.name}</label>
                <input id="pbw-name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="pbw-field">
                <label htmlFor="pbw-email">{labels.email}</label>
                <input
                  id="pbw-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="pbw-field">
                <label htmlFor="pbw-phone">{labels.phoneOptional}</label>
                <input id="pbw-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="pbw-field">
                <label htmlFor="pbw-notes">{labels.notes}</label>
                <textarea id="pbw-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              {turnstileSiteKey && <div ref={turnstileContainerRef} className="pbw-turnstile" />}
              {submitError && <p className="pbw-alert-error">{submitError}</p>}
              <button
                type="submit"
                className="pbw-button-primary"
                disabled={submitting || (!!turnstileSiteKey && !turnstileToken)}
              >
                {submitting ? labels.confirming : labels.confirm}
              </button>
            </form>
          </>
        )}

        {step === "success" && (
          <>
            <p className="pbw-alert-success">{labels.success}</p>
            <button type="button" className="pbw-button-primary pbw-book-another" onClick={resetForNewBooking}>
              {labels.bookAnother}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
