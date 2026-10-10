// Random tables from 05c4's check (reference/tools/random_safes.py, seed 1) where the series have two stable answers
// beside post-money SAFEs (05c5; Jordan, after #73): two non-participating series at the same price.

type Json = Record<string, unknown>;

/**
 * random-1-149: Series 0 and Series 1 Preferred, both at $1.00, beside two SAFEs. At $11,047,000 either converting is
 * stable, and both ends of the old search agreed on one of them.
 */
export const RANDOM_1_149: Json = {
  "cap_table": {
    "holders": [
      {
        "id": "founder_a",
        "name": "Founder A"
      },
      {
        "id": "founder_b",
        "name": "Founder B"
      },
      {
        "id": "investor_0",
        "name": "Investor 0"
      },
      {
        "id": "investor_1",
        "name": "Investor 1"
      },
      {
        "id": "lender_l",
        "name": "Lender L"
      },
      {
        "id": "safe_holder_0",
        "name": "SAFE Investor 0"
      },
      {
        "id": "safe_holder_1",
        "name": "SAFE Investor 1"
      }
    ],
    "securities": [
      {
        "id": "common",
        "name": "Common Stock",
        "kind": "common"
      },
      {
        "id": "series_0",
        "name": "Series 0 Preferred",
        "kind": "preferred",
        "original_issue_price": "1",
        "conversion_price": "1",
        "preference_multiple": "1",
        "participation": "non_participating",
        "cap_multiple": null,
        "anti_dilution": "none"
      },
      {
        "id": "series_1",
        "name": "Series 1 Preferred",
        "kind": "preferred",
        "original_issue_price": "1",
        "conversion_price": "1",
        "preference_multiple": "1",
        "participation": "non_participating",
        "cap_multiple": null,
        "anti_dilution": "none"
      },
      {
        "id": "warrants_series_0",
        "name": "Warrants for series_0",
        "kind": "warrant",
        "strike": "0.5",
        "underlying": "series_0"
      }
    ],
    "seniority": [
      [
        "series_0"
      ],
      [
        "series_1"
      ]
    ],
    "positions": [
      {
        "holder": "founder_a",
        "security": "common",
        "shares": 5000000
      },
      {
        "holder": "founder_b",
        "security": "common",
        "shares": 1000000
      },
      {
        "holder": "investor_0",
        "security": "series_0",
        "shares": 1000000
      },
      {
        "holder": "investor_1",
        "security": "series_1",
        "shares": 2000000
      },
      {
        "holder": "lender_l",
        "security": "warrants_series_0",
        "shares": 100000
      }
    ],
    "unissued_pool": 0,
    "unconverted_safes": [
      {
        "id": "safe_0",
        "holder": "safe_holder_0",
        "purchase_amount": "1000000",
        "post_money_cap": "8000000",
        "discount": "0"
      },
      {
        "id": "safe_1",
        "holder": "safe_holder_1",
        "purchase_amount": "500000",
        "post_money_cap": "8000000",
        "discount": "0.2"
      }
    ]
  },
  "range": [
    "0",
    "40000000"
  ],
  "exit_values": []
};

/**
 * random-1-185: Series 0 and Series 1 Preferred, both at $0.50, beside three SAFEs and a note. Its two answers last
 * only from about $10.10M to $10.14M, between the readings the search takes for its own breakpoints.
 */
export const RANDOM_1_185: Json = {
  "cap_table": {
    "holders": [
      {
        "id": "founder_a",
        "name": "Founder A"
      },
      {
        "id": "founder_b",
        "name": "Founder B"
      },
      {
        "id": "investor_0",
        "name": "Investor 0"
      },
      {
        "id": "investor_1",
        "name": "Investor 1"
      },
      {
        "id": "lender_l",
        "name": "Lender L"
      },
      {
        "id": "safe_holder_0",
        "name": "SAFE Investor 0"
      },
      {
        "id": "safe_holder_1",
        "name": "SAFE Investor 1"
      },
      {
        "id": "safe_holder_2",
        "name": "SAFE Investor 2"
      },
      {
        "id": "note_holder",
        "name": "Investor N"
      }
    ],
    "securities": [
      {
        "id": "common",
        "name": "Common Stock",
        "kind": "common"
      },
      {
        "id": "series_0",
        "name": "Series 0 Preferred",
        "kind": "preferred",
        "original_issue_price": "0.5",
        "conversion_price": "0.5",
        "preference_multiple": "1",
        "participation": "non_participating",
        "cap_multiple": null,
        "anti_dilution": "none"
      },
      {
        "id": "series_1",
        "name": "Series 1 Preferred",
        "kind": "preferred",
        "original_issue_price": "0.5",
        "conversion_price": "0.5",
        "preference_multiple": "1",
        "participation": "non_participating",
        "cap_multiple": null,
        "anti_dilution": "none"
      },
      {
        "id": "warrants_series_0",
        "name": "Warrants for series_0",
        "kind": "warrant",
        "strike": "0.25",
        "underlying": "series_0"
      }
    ],
    "seniority": [
      [
        "series_0",
        "series_1"
      ]
    ],
    "positions": [
      {
        "holder": "founder_a",
        "security": "common",
        "shares": 4000000
      },
      {
        "holder": "founder_b",
        "security": "common",
        "shares": 2000000
      },
      {
        "holder": "investor_0",
        "security": "series_0",
        "shares": 8000000
      },
      {
        "holder": "investor_1",
        "security": "series_1",
        "shares": 2000000
      },
      {
        "holder": "lender_l",
        "security": "warrants_series_0",
        "shares": 200000
      }
    ],
    "unissued_pool": 500000,
    "unconverted_safes": [
      {
        "id": "safe_0",
        "holder": "safe_holder_0",
        "purchase_amount": "250000",
        "post_money_cap": "10000000",
        "discount": "0"
      },
      {
        "id": "safe_1",
        "holder": "safe_holder_1",
        "purchase_amount": "100000",
        "post_money_cap": "4000000",
        "discount": "0"
      },
      {
        "id": "safe_2",
        "holder": "safe_holder_2",
        "purchase_amount": "500000",
        "post_money_cap": "10000000",
        "discount": "0"
      }
    ],
    "unconverted_notes": [
      {
        "id": "note_n",
        "holder": "note_holder",
        "principal": "500000",
        "interest_rate": "0.06",
        "issue_date": "2024-01-01",
        "valuation_cap": "5000000",
        "conversion_base": "with_pool",
        "discount": "0",
        "repayment_multiple": "2"
      }
    ]
  },
  "range": [
    "0",
    "40000000"
  ],
  "exit_values": [],
  "exit_date": "2025-12-31"
};

/**
 * random-1-121: Series 0 and Series 1 Preferred, both at $1.00 and pari passu, beside two SAFEs. Two answers from
 * $12,055,555.56; the search's check inside the stretch, read at $12,083,333.33, used to find them first (05c6).
 */
export const RANDOM_1_121: Json = {
  "cap_table": {
    "holders": [
      {
        "id": "founder_a",
        "name": "Founder A"
      },
      {
        "id": "founder_b",
        "name": "Founder B"
      },
      {
        "id": "employee_c",
        "name": "Employee C"
      },
      {
        "id": "investor_0",
        "name": "Investor 0"
      },
      {
        "id": "investor_1",
        "name": "Investor 1"
      },
      {
        "id": "safe_holder_0",
        "name": "SAFE Investor 0"
      },
      {
        "id": "safe_holder_1",
        "name": "SAFE Investor 1"
      }
    ],
    "securities": [
      {
        "id": "common",
        "name": "Common Stock",
        "kind": "common"
      },
      {
        "id": "options_0",
        "name": "Options ($0 strike)",
        "kind": "option",
        "strike": "0"
      },
      {
        "id": "series_0",
        "name": "Series 0 Preferred",
        "kind": "preferred",
        "original_issue_price": "1",
        "conversion_price": "1",
        "preference_multiple": "1",
        "participation": "non_participating",
        "cap_multiple": null,
        "anti_dilution": "none"
      },
      {
        "id": "series_1",
        "name": "Series 1 Preferred",
        "kind": "preferred",
        "original_issue_price": "1",
        "conversion_price": "1",
        "preference_multiple": "1",
        "participation": "non_participating",
        "cap_multiple": null,
        "anti_dilution": "none"
      }
    ],
    "seniority": [
      [
        "series_0",
        "series_1"
      ]
    ],
    "positions": [
      {
        "holder": "founder_a",
        "security": "common",
        "shares": 4000000
      },
      {
        "holder": "founder_b",
        "security": "common",
        "shares": 1000000
      },
      {
        "holder": "employee_c",
        "security": "options_0",
        "shares": 500000
      },
      {
        "holder": "investor_0",
        "security": "series_0",
        "shares": 4000000
      },
      {
        "holder": "investor_1",
        "security": "series_1",
        "shares": 1000000
      }
    ],
    "unissued_pool": 0,
    "unconverted_safes": [
      {
        "id": "safe_0",
        "holder": "safe_holder_0",
        "purchase_amount": "500000",
        "post_money_cap": "15000000",
        "discount": "0"
      },
      {
        "id": "safe_1",
        "holder": "safe_holder_1",
        "purchase_amount": "1000000",
        "post_money_cap": "10000000",
        "discount": "0"
      }
    ]
  },
  "range": [
    "0",
    "40000000"
  ],
  "exit_values": []
};
