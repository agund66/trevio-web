// ─── Locale messages barrel ───────────────────────────────────────
// Aggregates all namespace JSON files into a single messages object
// for next-intl. This is imported by the I18nProvider.

import common from "./common.json";
import auth from "./auth.json";
import profile from "./profile.json";
import dashboard from "./dashboard.json";
import groups from "./groups.json";
import expenses from "./expenses.json";
import household from "./household.json";
import notifications from "./notifications.json";
import support from "./support.json";
import admin from "./admin.json";
import more from "./more.json";
import validation from "./validation.json";
import categories from "./categories.json";
import countries from "./countries.json";
import currencies from "./currencies.json";
import karma from "./karma.json";
import nudges from "./nudges.json";
import wrapped from "./wrapped.json";

const en = {
  common,
  auth,
  profile,
  dashboard,
  groups,
  expenses,
  household,
  notifications,
  support,
  admin,
  more,
  validation,
  categories,
  countries,
  currencies,
  karma,
  nudges,
  wrapped,
};

export type Messages = typeof en;
export default en;
