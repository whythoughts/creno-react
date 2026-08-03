export interface Slot {
  startAt: string; // ISO UTC
  endAt: string; // ISO UTC
}

export interface ServiceType {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface BookingWidgetLabels {
  chooseService: string;
  changeService: string;
  loading: string;
  noAvailability: string;
  back: string;
  selectedDatePrefix: string; // e.g. "Available times for"
  name: string;
  email: string;
  phone: string;
  phoneOptional: string;
  notes: string;
  confirm: string;
  confirming: string;
  success: string;
  bookAnother: string;
  genericError: string;
  slotTakenError: string;
  monthNames: string[]; // 12, full names
  dayNamesShort: string[]; // 7, starting Sunday
}

export interface BookingWidgetProps {
  /** Base URL of the platform API, e.g. "https://api.solutionlancee.com" */
  apiUrl: string;
  /** The tenant's publishable key (safe to expose in browser JS). */
  apiKey: string;
  /** Optional resource override; omit to use the tenant's default resource. */
  resourceId?: string;
  /**
   * Built-in UI language, "en" or "fr" ship real translations out of the
   * box; anything else falls back to English. Also sent with the booking
   * (see bookings.lang) so confirmation/notification emails match. Defaults
   * to "en".
   */
  lang?: string;
  /** Override any subset of the selected language's UI strings. */
  labels?: Partial<BookingWidgetLabels>;
  /** IANA locale used for date/time formatting, e.g. "fr-CA". Defaults to a sensible locale for `lang`. */
  formatLocale?: string;
  /**
   * Cloudflare Turnstile site key (safe to expose in browser JS). Omit to
   * skip bot-challenge verification entirely, the widget works exactly as
   * before. See the API's TURNSTILE_SECRET_KEY for the matching server side.
   */
  turnstileSiteKey?: string;
  /** Called after a booking is successfully created. */
  onBooked?: (booking: { id: string }) => void;
  /**
   * Identifies which wrapper is rendering this widget (sent as
   * X-Client-Library on every API call, see api.ts's createApiClient), * "react" by default for direct use of this component; the embed script
   * and Vue wrapper each override it with their own name.
   */
  clientLibrary?: string;
}
