import type { ServiceType, Slot } from "./types.js";

export interface AvailabilityResponse {
  resourceId: string;
  timezone: string;
  slots: Slot[];
}

export interface CreateBookingInput {
  resourceId?: string;
  serviceTypeId?: string;
  startAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
  lang?: string;
  turnstileToken?: string;
}

export class BookingApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown = null) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export class CrenoAuthenticationError extends BookingApiError {}
export class CrenoForbiddenError extends BookingApiError {}
export class CrenoNotFoundError extends BookingApiError {}
export class CrenoValidationError extends BookingApiError {}
export class CrenoConflictError extends BookingApiError {}
export class CrenoRateLimitError extends BookingApiError {}

// Matches the Python and Node SDKs' exception taxonomy: the plan-limit
// error carries which limit was hit and the tenant's current plan so a
// caller can show an upgrade prompt without re-parsing the response body.
export class CrenoPlanLimitError extends BookingApiError {
  limitType?: string;
  plan?: string;
  constructor(message: string, status: number, body: unknown, limitType?: string, plan?: string) {
    super(message, status, body);
    this.limitType = limitType;
    this.plan = plan;
  }
}

function errorFor(status: number, message: string, body: unknown): BookingApiError {
  switch (status) {
    case 401:
      return new CrenoAuthenticationError(message, status, body);
    case 403:
      return new CrenoForbiddenError(message, status, body);
    case 404:
      return new CrenoNotFoundError(message, status, body);
    case 400:
      return new CrenoValidationError(message, status, body);
    case 409:
      return new CrenoConflictError(message, status, body);
    case 402: {
      const b = body as { limitType?: string; plan?: string } | null;
      return new CrenoPlanLimitError(message, status, body, b?.limitType, b?.plan);
    }
    case 429:
      return new CrenoRateLimitError(message, status, body);
    default:
      return new BookingApiError(message, status, body);
  }
}

// clientLibrary identifies which wrapper is actually rendering this widget
// (embed script, Vue, or this React component used directly), every
// wrapper ultimately funnels through this one client, so
// this is the one place that needs to know, not each wrapper reimplementing
// its own fetch calls. Read server-side off X-Client-Library and logged per
// request (see plugins/public-auth.ts), surfaced in the Control Center so
// an agency/SaaS customer's actual integration method is visible instead of
// just "some browser called the API."
export function createApiClient(apiUrl: string, apiKey: string, clientLibrary = "react") {
  const headers = { "X-API-Key": apiKey, "X-Client-Library": clientLibrary };

  async function request<T>(path: string): Promise<T> {
    const res = await fetch(`${apiUrl}${path}`, { headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw errorFor(res.status, body.error ?? `Request failed (${res.status})`, body);
    }
    return res.json();
  }

  return {
    fetchServiceTypes: (resourceId?: string): Promise<ServiceType[]> =>
      request(`/v1/public/service-types${resourceId ? `?resourceId=${resourceId}` : ""}`),

    fetchAvailability: (from: string, to: string, opts: { resourceId?: string; serviceTypeId?: string } = {}) => {
      const params = new URLSearchParams({ from, to });
      if (opts.resourceId) params.set("resourceId", opts.resourceId);
      if (opts.serviceTypeId) params.set("serviceTypeId", opts.serviceTypeId);
      return request<AvailabilityResponse>(`/v1/public/availability?${params}`);
    },

    createBooking: async (input: CreateBookingInput): Promise<{ id: string }> => {
      const res = await fetch(`${apiUrl}/v1/public/bookings`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw errorFor(res.status, body.error ?? `Booking failed (${res.status})`, body);
      }
      return res.json();
    },
  };
}
