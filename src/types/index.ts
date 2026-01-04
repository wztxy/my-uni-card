/**
 * Campus card transaction record
 */
export interface TransactionRecord {
  date: string; // YYYY-MM-DD HH:mm:ss
  amount: number; // Negative for expenses, positive for recharge
  merName: string; // Merchant name
  balance: number; // Balance after transaction
  txName: string; // Transaction type
}

/**
 * User login information
 */
export interface UserInfo {
  stuNo: string;
  name: string;
}

/**
 * Report statistics
 */
export interface ReportStats {
  totalAmount: number;
  totalCount: number;
  averageAmount: number;
  lastBalance: number;
  categoryBreakdown: Map<string, number>;
}
