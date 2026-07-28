import type { BookingWidgetLabels } from "../types.js";

// Québécois French, matching the voice already used across Créno's
// French-speaking customers (e.g. "courriel" not "email", "rendez-vous").
export const fr: BookingWidgetLabels = {
  chooseService: "Choisissez un service",
  changeService: "Changer de service",
  loading: "Chargement des disponibilités…",
  noAvailability: "Aucune disponibilité ce mois-ci.",
  back: "Retour",
  selectedDatePrefix: "Créneaux disponibles le",
  name: "Nom",
  email: "Courriel",
  phone: "Téléphone",
  phoneOptional: "Téléphone (optionnel)",
  notes: "Notes (optionnel)",
  confirm: "Confirmer le rendez-vous",
  confirming: "Réservation en cours…",
  success: "C'est réservé! Un courriel de confirmation s'en vient.",
  bookAnother: "Réserver un autre rendez-vous",
  genericError: "Une erreur est survenue. Veuillez réessayer.",
  slotTakenError: "Ce créneau vient d'être réservé par quelqu'un d'autre. Veuillez en choisir un autre.",
  monthNames: [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ],
  dayNamesShort: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
};
