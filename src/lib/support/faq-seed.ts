import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "../firebase";

interface SeedArticle {
  title: string;
  content: string;
  category: string;
  tags: string[];
  order: number;
}

const SEED_ARTICLES: SeedArticle[] = [
  // ─── Balance & Calculations ─────────────────────────────────────
  {
    title: "Why does my balance look wrong?",
    category: "calculation",
    tags: ["balance", "calculation", "split"],
    order: 1,
    content: `<h3>Understanding Your Balance</h3>
<p>Your balance in a group represents the net amount you owe or are owed across all expenses in that group.</p>
<ul>
<li><strong>Positive balance (+)</strong>: You are owed money. You paid more than your share.</li>
<li><strong>Negative balance (-)</strong>: You owe money. You paid less than your share.</li>
<li><strong>Zero balance</strong>: You're all settled up.</li>
</ul>
<h3>Common Reasons Your Balance Might Look Wrong</h3>
<ol>
<li><strong>Recent expense not reflected</strong>: Try pulling to refresh or navigating away and back to the group.</li>
<li><strong>Settlement not recorded</strong>: If you paid someone outside the app, you need to record a settlement in the app for the balance to update.</li>
<li><strong>Wrong split type</strong>: Check the expense details — was it split equally, or by exact amounts? The split type affects everyone's share.</li>
<li><strong>Currency conversion</strong>: If expenses are in different currencies, they're converted to the group's base currency using exchange rates. Small rounding differences may occur.</li>
</ol>
<p>If none of these explain the issue, please report it using the "Report an Issue" option so we can investigate.</p>`,
  },
  {
    title: "How are simplified debts calculated?",
    category: "calculation",
    tags: ["debt", "simplification", "settlement"],
    order: 2,
    content: `<h3>Debt Simplification</h3>
<p>Trevio uses a debt simplification algorithm to minimize the number of payments needed to settle all balances in a group.</p>
<h3>How It Works</h3>
<p>Instead of everyone paying everyone else, the algorithm calculates the minimum set of transactions needed. For example:</p>
<ul>
<li>If A owes B ₹100 and B owes A ₹40, instead of two payments, the simplified result is: A pays B ₹60.</li>
<li>The algorithm nets out all mutual debts across all group members.</li>
</ul>
<h3>Why Your Settlement Amounts Might Differ</h3>
<p>The "Settle Up" screen shows simplified debts, not raw balances. This is intentional — it reduces the number of transactions. The total amount you pay or receive will always be correct; only the intermediate paths are optimized.</p>
<p>If you believe the simplified amounts are incorrect, please report the issue with the group name and we'll investigate.</p>`,
  },
  {
    title: "Understanding multi-currency expenses and exchange rates",
    category: "calculation",
    tags: ["currency", "exchange rate", "multi-currency"],
    order: 3,
    content: `<h3>Multi-Currency Support</h3>
<p>Trevio supports expenses in different currencies within the same group. All amounts are converted to the group's base currency for balance calculations.</p>
<h3>How Exchange Rates Work</h3>
<ul>
<li>When you add an expense in a non-base currency, Trevio fetches the current exchange rate and stores it with the expense.</li>
<li>The rate is cached for 24 hours, so multiple expenses in the same currency use the same rate.</li>
<li>Your balance is always shown in the group's base currency.</li>
</ul>
<h3>Tips</h3>
<ul>
<li>Set your group currency to the currency you'll use most often to minimize conversion.</li>
<li>Exchange rates are approximate. For exact splits in a foreign currency, consider creating a separate group in that currency.</li>
</ul>`,
  },

  // ─── Settlements ────────────────────────────────────────────────
  {
    title: "How to settle up with a friend",
    category: "settlement",
    tags: ["settlement", "payment", "upi"],
    order: 4,
    content: `<h3>Settling Up</h3>
<p>When you're ready to pay someone back, use the "Settle Up" button in your group.</p>
<ol>
<li>Open the group where you have an outstanding balance.</li>
<li>Tap "Settle Up" to see the simplified debts.</li>
<li>Choose who you want to pay and the amount.</li>
<li>Select the payment method: UPI, Cash, or Other.</li>
<li>If UPI, you can use the recipient's UPI ID (if they've set it up) to make the payment directly.</li>
<li>Record the settlement in the app once the payment is complete.</li>
</ol>
<p>The balance will update immediately after recording the settlement.</p>`,
  },
  {
    title: "I recorded a settlement but my balance didn't change",
    category: "settlement",
    tags: ["settlement", "balance", "troubleshooting"],
    order: 5,
    content: `<h3>Troubleshooting Settlement Issues</h3>
<p>If your balance didn't update after recording a settlement:</p>
<ol>
<li><strong>Refresh the page</strong>: Navigate away from the group and come back, or pull to refresh.</li>
<li><strong>Check the settlement list</strong>: Go to the group's settlement history and verify the settlement was recorded.</li>
<li><strong>Check the direction</strong>: Make sure you recorded the settlement in the right direction (you paid them, not they paid you).</li>
<li><strong>Check the amount</strong>: The settlement amount should match or be less than what you owed. If you overpaid, the excess won't show as a negative balance — it'll be treated as a full settlement.</li>
</ol>
<p>If the settlement appears in the history but balances are still wrong, please report the issue with the group name and settlement details.</p>`,
  },
  {
    title: "Recording cash vs UPI payments",
    category: "settlement",
    tags: ["cash", "upi", "payment method"],
    order: 6,
    content: `<h3>Payment Methods</h3>
<p>Trevio supports three payment methods for settlements:</p>
<ul>
<li><strong>UPI</strong>: For digital payments via UPI. If the recipient has set up their UPI ID, you can pay directly from the app.</li>
<li><strong>Cash</strong>: For in-person cash payments. Simply record the amount and mark it as cash.</li>
<li><strong>Other</strong>: For any other payment method (bank transfer, wallet, etc.).</li>
</ul>
<p>The payment method is for your records only — it doesn't affect the balance calculation. Choose whichever method you actually used.</p>`,
  },

  // ─── Groups ─────────────────────────────────────────────────────
  {
    title: "How to join a group with an invite code",
    category: "group_access",
    tags: ["invite", "join", "group"],
    order: 7,
    content: `<h3>Joining a Group</h3>
<p>There are several ways to join a group:</p>
<ol>
<li><strong>Invite code</strong>: Enter the invite code on the "Join Group" screen. You can get this code from the group admin.</li>
<li><strong>QR code</strong>: Scan the group's QR code using the scanner in the app.</li>
<li><strong>Direct link</strong>: If someone shares a group link with you, tapping it will open the app and take you to the join screen.</li>
</ol>
<h3>Troubleshooting</h3>
<ul>
<li><strong>"Invalid invite code"</strong>: Double-check the code with the group admin. Codes are case-sensitive.</li>
<li><strong>"Already a member"</strong>: You're already in this group. Check your groups list.</li>
<li><strong>Can't find the group after joining</strong>: Try refreshing your groups list.</li>
</ul>`,
  },
  {
    title: "How to create and manage a group",
    category: "group_access",
    tags: ["create", "manage", "group"],
    order: 8,
    content: `<h3>Creating a Group</h3>
<ol>
<li>Tap "Create Group" on the groups screen.</li>
<li>Choose a template: Trip, Turf, or Casual.</li>
<li>Enter a group name and description.</li>
<li>Select the group's base currency.</li>
<li>Add members by username or invite them later.</li>
</ol>
<h3>Managing Your Group</h3>
<ul>
<li><strong>Invite members</strong>: Share the invite code or QR code from the group settings.</li>
<li><strong>Add offline members</strong>: You can add people who don't have the app yet. They'll be tracked as offline members.</li>
<li><strong>Transfer admin</strong>: As the group admin, you can transfer admin rights to another member in group settings.</li>
<li><strong>Archive</strong>: You can archive a group to hide it from your active list without deleting it.</li>
</ul>`,
  },
  {
    title: "Leaving or archiving a group",
    category: "group_access",
    tags: ["leave", "archive", "group"],
    order: 9,
    content: `<h3>Leaving a Group</h3>
<p>You can leave a group from the group settings:</p>
<ul>
<li>Your balance must be zero to leave. Settle all outstanding debts first.</li>
<li>If you're the group admin, you need to transfer admin rights to another member before leaving.</li>
<li>After leaving, you'll lose access to the group's expenses and settlements.</li>
</ul>
<h3>Archiving a Group</h3>
<p>If you want to keep the data but hide the group:</p>
<ul>
<li>Archive the group from group settings.</li>
<li>Archived groups are hidden from your active list but can be unarchived later.</li>
<li>All expenses and settlements are preserved.</li>
</ul>`,
  },

  // ─── Expenses ───────────────────────────────────────────────────
  {
    title: "Understanding split types: equal, exact, percent, shares, itemized",
    category: "expense",
    tags: ["split", "equal", "exact", "percent", "itemized"],
    order: 10,
    content: `<h3>Split Types</h3>
<p>Trevio supports five ways to split an expense:</p>
<ul>
<li><strong>Equal</strong>: The amount is divided equally among all selected members. Simplest and most common.</li>
<li><strong>Exact</strong>: You specify the exact amount each person owes. The total must match the expense amount.</li>
<li><strong>Percent</strong>: You specify what percentage each person owes. Must add up to 100%.</li>
<li><strong>Shares</strong>: You specify how many "shares" each person gets. The amount is divided proportionally. Useful when people contributed differently.</li>
<li><strong>Itemized</strong>: You add individual items (like a restaurant bill) and assign each item to specific people. Supports tax and tip calculation.</li>
</ul>
<h3>Tips</h3>
<ul>
<li>You don't have to split among everyone — deselect members who shouldn't be included.</li>
<li>For itemized splits, you can assign items to multiple people and they'll split that item equally.</li>
</ul>`,
  },
  {
    title: "How to edit or delete an expense",
    category: "expense",
    tags: ["edit", "delete", "expense"],
    order: 11,
    content: `<h3>Editing an Expense</h3>
<ol>
<li>Open the group and find the expense in the list.</li>
<li>Tap on the expense to view details.</li>
<li>Tap the edit button to modify the amount, split type, or other details.</li>
<li>Save your changes — the balances will recalculate automatically.</li>
</ol>
<h3>Deleting an Expense</h3>
<ol>
<li>Open the expense details.</li>
<li>Tap the delete button.</li>
<li>Confirm the deletion.</li>
</ol>
<p>Any active group member can edit or delete expenses. Be careful — deletions are permanent and will affect everyone's balances.</p>`,
  },
  {
    title: "Adding recurring expenses",
    category: "expense",
    tags: ["recurring", "expense", "monthly", "weekly"],
    order: 12,
    content: `<h3>Recurring Expenses</h3>
<p>You can set up recurring expenses for things like rent, subscriptions, or regular shared costs.</p>
<ol>
<li>Create an expense as usual.</li>
<li>Enable the "Recurring" option.</li>
<li>Choose the frequency: Weekly or Monthly.</li>
<li>Optionally set an end date.</li>
</ol>
<p>The expense will be automatically duplicated at the specified interval. Each occurrence is a separate expense that can be edited or deleted independently.</p>`,
  },

  // ─── Account & Profile ──────────────────────────────────────────
  {
    title: "Setting up your UPI ID for easy payments",
    category: "payment_info",
    tags: ["upi", "payment", "profile"],
    order: 13,
    content: `<h3>UPI ID Setup</h3>
<p>Setting up your UPI ID makes it easy for friends to pay you directly from the app.</p>
<ol>
<li>Go to your Profile screen.</li>
<li>Tap "Edit" and find the UPI ID field.</li>
<li>Enter your UPI ID (e.g., yourname@bankname).</li>
<li>Save your profile.</li>
</ol>
<p>Once set up, when someone needs to pay you, they'll see your UPI ID in the Settle Up screen and can initiate payment directly.</p>
<p>You can also set up your phone number as an alternative payment method.</p>`,
  },
  {
    title: "Changing your default currency",
    category: "account",
    tags: ["currency", "profile", "settings"],
    order: 14,
    content: `<h3>Default Currency</h3>
<p>Your default currency is used when you create new groups or expenses. To change it:</p>
<ol>
<li>Go to your Profile screen.</li>
<li>Tap "Edit".</li>
<li>Find the Currency field and select your preferred currency from the list.</li>
<li>Save your profile.</li>
</ol>
<p>Note: Changing your default currency doesn't affect existing groups or expenses. It only applies to new ones you create.</p>`,
  },
  {
    title: "Deleting your account — what happens to your data",
    category: "account",
    tags: ["delete", "account", "data"],
    order: 15,
    content: `<h3>Account Deletion</h3>
<p>You can delete your account from the Profile screen. Here's what happens:</p>
<ul>
<li><strong>Your account</strong>: Your user profile, authentication, and personal data are permanently deleted.</li>
<li><strong>Groups</strong>: You're removed from all groups you're a member of.</li>
<li><strong>Expenses you created</strong>: Remain in the group for other members' records, but your name will show as "Deleted User".</li>
<li><strong>Settlements</strong>: Settlement records remain for other members' history.</li>
<li><strong>Balances</strong>: If you have outstanding balances, they'll be settled to zero upon deletion. Other members' balances will adjust accordingly.</li>
</ul>
<p><strong>This action cannot be undone.</strong> Make sure you've settled all debts before deleting your account.</p>`,
  },

  // ─── Troubleshooting ────────────────────────────────────────────
  {
    title: "App is running slow or not loading",
    category: "bug",
    tags: ["slow", "loading", "performance"],
    order: 16,
    content: `<h3>Performance Troubleshooting</h3>
<p>If the app is running slowly or not loading content:</p>
<ol>
<li><strong>Check your internet connection</strong>: Ensure you have a stable connection.</li>
<li><strong>Refresh the page</strong>: Pull to refresh or navigate away and back.</li>
<li><strong>Sign out and sign back in</strong>: This re-establishes your connection to the server.</li>
<li><strong>Clear browser cache (Web)</strong>: If using the web app, try clearing your browser cache or using incognito mode.</li>
<li><strong>Restart the app (Android)</strong>: Close and reopen the app.</li>
<li><strong>Update the app</strong>: Make sure you're using the latest version.</li>
</ol>
<p>If the issue persists, please report it with details about what you were trying to do when it happened.</p>`,
  },
  {
    title: "Data not syncing between devices",
    category: "bug",
    tags: ["sync", "data", "multi-device"],
    order: 17,
    content: `<h3>Data Syncing Issues</h3>
<p>Trevio syncs data in real-time across devices. If you're not seeing updated data:</p>
<ol>
<li><strong>Refresh</strong>: Pull to refresh on mobile or reload the page on web.</li>
<li><strong>Check your connection</strong>: Real-time sync requires an active internet connection.</li>
<li><strong>Sign out and back in</strong>: This forces a full re-sync of your data.</li>
<li><strong>Check if you're in the right group</strong>: Make sure you're looking at the correct group.</li>
</ol>
<p>If data is consistently out of sync, please report the issue with details about which data is affected (expenses, settlements, balances, etc.).</p>`,
  },
];

/**
 * Seeds help articles into Firestore if none exist.
 * Called on app load — safe to call multiple times (no-ops if articles exist).
 */
export async function seedHelpArticlesIfEmpty(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, "helpArticles"));
    if (!snapshot.empty) return;

    const batch = writeBatch(db);
    const now = Date.now();
    const currentUser = "system";

    SEED_ARTICLES.forEach((article) => {
      const ref = doc(collection(db, "helpArticles"));
      batch.set(ref, {
        title: article.title,
        content: article.content,
        category: article.category,
        tags: article.tags,
        order: article.order,
        active: true,
        createdAt: now,
        updatedAt: now,
        createdBy: currentUser,
      });
    });

    await batch.commit();
  } catch (e) {
    // Silently fail — seeding is a convenience, not critical
    console.error("Failed to seed help articles:", e);
  }
}
