// Database Types
export type SessionStatus = 'waiting' | 'active' | 'trading' | 'settling' | 'closed'
export type TradeType = 'buy' | 'sell'

export interface Teacher {
  id: string
  email: string
  name: string
  created_at: string
}

export interface Session {
  id: string
  teacher_id: string
  class_name: string
  subject: string
  unit_name: string
  join_code: string
  status: SessionStatus
  trade_end_at: string | null
  created_at: string
}

export interface Stock {
  id: string
  session_id: string
  keyword: string
  is_hidden: boolean
  is_revealed: boolean
  is_core: boolean
  display_order: number
  created_at: string
}

export interface Student {
  id: string
  session_id: string
  nickname: string
  balance: number
  created_at: string
}

export interface Bookmark {
  id: string
  student_id: string
  stock_id: string
  created_at: string
}

export interface Trade {
  id: string
  student_id: string
  stock_id: string
  type: TradeType
  amount: number
  created_at: string
}

export interface Holding {
  id: string
  student_id: string
  stock_id: string
  amount: number
}

// Extended types with relations
export interface StockWithStats extends Stock {
  bookmark_count?: number
  buy_count?: number
  total_invested?: number
}

export interface StudentWithHoldings extends Student {
  holdings?: Holding[]
  bookmarks?: Bookmark[]
}

// API Response types
export interface BuyStockResponse {
  success: boolean
  error?: string
  new_balance?: number
}

export interface SellStockResponse {
  success: boolean
  error?: string
  new_balance?: number
  sold_amount?: number
}

export interface SettleSessionResponse {
  success: boolean
  student_results?: {
    student_id: string
    nickname: string
    final_balance: number
    accuracy: number
  }[]
}

// Database type for Supabase client
export interface Database {
  public: {
    Tables: {
      teachers: {
        Row: Teacher
        Insert: Omit<Teacher, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Teacher>
      }
      sessions: {
        Row: Session
        Insert: Omit<Session, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Session>
      }
      stocks: {
        Row: Stock
        Insert: Omit<Stock, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Stock>
      }
      students: {
        Row: Student
        Insert: Omit<Student, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Student>
      }
      bookmarks: {
        Row: Bookmark
        Insert: Omit<Bookmark, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Bookmark>
      }
      trades: {
        Row: Trade
        Insert: Omit<Trade, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Trade>
      }
      holdings: {
        Row: Holding
        Insert: Omit<Holding, 'id'> & { id?: string }
        Update: Partial<Holding>
      }
    }
    Functions: {
      buy_stock: {
        Args: { p_student_id: string; p_stock_id: string; p_amount: number }
        Returns: BuyStockResponse
      }
      sell_stock: {
        Args: { p_student_id: string; p_stock_id: string }
        Returns: SellStockResponse
      }
      settle_session: {
        Args: { p_session_id: string; p_core_stock_ids: string[] }
        Returns: SettleSessionResponse
      }
      generate_join_code: {
        Args: Record<string, never>
        Returns: string
      }
    }
  }
}
