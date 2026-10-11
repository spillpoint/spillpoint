// The headers each OCX tab writes (OX12, OX14): 0.4/0.5's from the Coalition's reference workbooks, 0.7's from the one
// export seen, Mantle's. Only tab names and headers, which are the format's interface, never anything else from either
// (CLAUDE.md, hard rule 10). A header outside these, outside the holdings, gets an `unrecognized_field` line. The page's
// cell-kinds script (apps/dashboard/src/ocxStructure.ts) lists the same headers, and a page test holds the two together.

const FINANCING = [
  "Round", "Initial Closing Date", "Most Recent Closing Date", "Original Issue Price", "Adjusted Conversion Price", "Conversion Ratio", "Liquidation Multiple",
  "Participating (Y/N)", "Participation Cap",
];
const PLAN_DETAILS = ["Total Reserved", "Total Granted", "Outstanding Shares/Exercised Options", "Outstanding Options", "Outstanding RSUs", "Shares Returned to Plan", "Shares Available for Grant"];

export const OCX_HEADERS: Readonly<Record<string, readonly string[]>> = {
  "Summary Snapshot": [
    "Share Class", "Shares Authorized/ Reserved", "Outstanding Shares", "Fully Diluted Shares", "% Fully Diluted", "Liquidation Preference",
    "Voting Multiplier", "Voting Power", "Voting %", "Security Type", "# of Securities", "Outstanding Amount", "Discount", "Valuation Cap",
  ],
  "Stakeholder Snapshot": [
    "Stakeholder", "Stakeholder Group", "Non-Plan Awards", "Total Stock (outstanding)", "Total Stock (as converted)", "Total Stock % (as converted)",
    "Fully Diluted Shares", "Fully Diluted %",
  ],
  Context: [
    ...FINANCING, "Valuation Date", "Price Per Share (Common)", "Options Outstanding at Valuation", "Valuation Firm", "Plan Name", "Date", "Action",
    "Stockholder Approval Date", "Number of Shares", "Total Shares Reserved", ...PLAN_DETAILS, "Classes/Series Affected", "Original Shares", "Resulting Shares",
  ],
  "Summary View": [
    "Share Class", "Shares Authorized/Reserved", "Outstanding Shares", "Fully Diluted Shares", "% Fully Diluted", "Liquidation Preference",
    "Voting Multiplier", "Voting Power", "Voting %", "Security Type", "# of Securities", "Outstanding Amount", "Discount", "Valuation Cap", "MFN",
  ],
  "Stakeholder View": [
    "Stakeholder", "Stakeholder Group", "Stock Warrants", "Non-Plan Awards", "Total Stock (outstanding)", "Total Stock (as converted)",
    "Total Stock % (as converted)", "Fully Diluted Shares", "Fully Diluted %",
  ],
  "Context 0.7": [...FINANCING, "Plan Name", "Date", "Action", "Stockholder Approval Date", "No. Shares", "Total Shares Reserved", ...PLAN_DETAILS],
  "class ledger": [
    "Stockholder", "Issue Date", "Board Approval Date", "Cert No.", "Cert. Transferred From", "Cert. Transferred To", "No. Shares Issued",
    "Basis of Issuance", "Price", "Cash Paid", "Debt Cancelled", "Cancellation Date", "Reason for Cancellation", "Certificate Outstanding (Y/N)",
    "No. Shares Outstanding", "Vesting Commencement Date", "Vesting Schedule", "Shares Vested", "Acceleration", "Federal Exemption", "Plan Security (Y/N)",
    "State of Residence", "Rule 144 Date", "Termination Date", "Comments", "Fully Diluted Ownership", "Equity Plan Name", "Price Per Share Currency",
    "Consolidation Currency", "Originating From", "Resulting Securities",
  ],
  "plan ledger": [
    "Optionholder", "Grant Date", "Board Approval Date", "Cert No.", "Shares Granted", "Type", "Exercisability", "Exercise Price",
    "Split Adjusted Exercise Price", "Total Purchase Price", "Vesting Commencement Date", "Vesting Schedule", "Acceleration", "Amount Exercised / Purchased",
    "Split Adjusted Amount Exercised / Purchased", "Exercise Date(s)", "Amount Canceled / Repurchased", "Split Adjusted Amount Canceled / Repurchased",
    "Cancellation / Repurchase Date", "Amount Expired", "Split Adjusted Amount Expired", "Expiration Date", "Immediate Vest Amount",
    "Vesting Length (months)", "Months from Grant Date", "Cliff Duration (months)", "Shares Outstanding from Original Grant",
    "Shares Vested from Original Grant", "Split Adjusted Shares Outstanding", "Split Adjusted Shares Vested", "% Vested",
    "Shares Unvested from Original Grant", "Split Adjusted Shares Unvested", "% Unvested", "State of Residence", "Termination Date", "Comments",
    "Share Class", "Display Status", "Stakeholder Relationship", "Exercise Currency", "Last Date to Exercise", "Resulting Securities",
  ],
  "Warrants Ledger": [
    "Convertible Holder", "Warrant No.", "Issue Date", "Board Approval Date", "No. Maximum Warrant Shares Issuable",
    "Original No. Maximum Warrant Shares Issuable (pre-split)", "Series of Stock", "Basis of Issuance", "Price Per Share",
    "Original Price Per Share (pre-split)", "No. Warrant Shares Exercised", "Original No. Warrant Shares Exercised (pre-split)", "Exercise Date(s)",
    "No. Warrant Shares Canceled", "Original No. Warrant Shares Canceled (pre-split)", "Cancellation Date", "Expiration Date", "State of Residence",
    "Federal Exemption", "Comments", "Display Status", "Stakeholder Relationship", "Exercise Currency", "Consideration", "Consideration Currency",
    "Vesting Schedule", "Vesting Commencement Date", "Warrant Shares Outstanding", "Shares Vested from Original Warrant", "Unvested Outstanding Quantity",
    "Resulting Securities",
  ],
  "SAFEs Ledger": [
    "SAFE Holder", "SAFE No.", "Issue Date", "Board Approval Date", "Investment Amount", "Basis of Issuance", "Valuation Cap", "Discount",
    "Valuation Method (Pre- or Post-Money)", "Conversion Date", "No. Shares Issued in Conversion", "Original No. Shares Issued in Conversion (pre-split)",
    "Conversion Price Per Share", "Original Conversion Price Per Share (pre-split)", "Cancellation Date", "Class of Converted Securities",
    "State of Residence", "Federal Exemption", "Comments", "Display Status", "Stakeholder Relationship", "Investment Amount Currency",
    "Valuation Cap Currency", "Most Favored Nation", "Originating From", "Resulting Securities",
  ],
};

/** On a per-holder tab, after its holdings: the voting block, set aside, and the Additional Information block, never read. */
export const OCX_VOTING = ["All Common", "All Preferred (as converted)"];
export const OCX_ADDITIONAL = [
  "Primary Stakeholder Type", "Secondary Stakeholder Types", "Mailing Address Line 1", "Mailing Address Line 2", "City", "State", "Country", "Zip Code",
  "Email Address", "Notes",
];

/** Context's tables, by title (OX14). */
export const OCX_TITLES = ["Financing History", "409A Valuations", "Stock Plan History", "Stock Plan Details", "Split/Combination Adjustment", "Shareholder Groups"];
