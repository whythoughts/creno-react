import type { BookingWidgetLabels } from "../types.js";

export const en: BookingWidgetLabels = {
  chooseService: "Choose a service",
  changeService: "Change service",
  loading: "Loading availability…",
  noAvailability: "No availability this month.",
  back: "Back",
  selectedDatePrefix: "Available times for",
  name: "Name",
  email: "Email",
  phone: "Phone",
  phoneOptional: "Phone (optional)",
  notes: "Notes (optional)",
  confirm: "Confirm booking",
  confirming: "Booking…",
  success: "You're booked! A confirmation email is on its way.",
  bookAnother: "Book another appointment",
  genericError: "Something went wrong. Please try again.",
  slotTakenError: "That time was just booked by someone else. Please pick another.",
  monthNames: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
  dayNamesShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};
