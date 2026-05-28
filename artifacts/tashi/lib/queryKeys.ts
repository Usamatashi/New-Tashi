export const queryKeys = {
  adminDashboard: ["admin-dashboard-summary"] as const,
  claims: ["admin-claims"] as const,
  adminProducts: ["admin-products"] as const,
  adminUsers: ["admin-users"] as const,
  adminRegions: ["admin-regions"] as const,
  ads: ["admin-ads"] as const,
  ticker: ["admin-ticker"] as const,
  salesmanPayments: {
    summary: ["salesman-summary"] as const,
    balances: ["salesman-retailer-balances"] as const,
    payments: ["salesman-payments"] as const,
    commissions: ["my-commissions"] as const,
  },
  adminPayments: {
    balances: ["admin-retailer-balances"] as const,
    payments: ["admin-payments"] as const,
  },
  userProducts: ["user-products"] as const,
  claimsHistory: ["claims"] as const,
};
