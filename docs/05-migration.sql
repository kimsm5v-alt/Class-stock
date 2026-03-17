-- ============================================
-- Class-Stock Supabase 초기 마이그레이션
-- 파일: supabase/migrations/001_initial_schema.sql
-- ============================================

-- ──────────────────────────────────────────
-- 1. 테이블 생성
-- ──────────────────────────────────────────

-- 교사
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 수업 세션
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  unit_name TEXT NOT NULL,
  join_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'active', 'trading', 'settling', 'closed')),
  trade_end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 종목 (키워드)
CREATE TABLE stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  is_hidden BOOLEAN DEFAULT false,
  is_revealed BOOLEAN DEFAULT false,
  is_core BOOLEAN DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 학생 (세션 단위)
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  balance INT NOT NULL DEFAULT 10000,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (session_id, nickname)
);

-- 찜하기
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, stock_id)
);

-- 거래 기록
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  amount INT NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 보유 현황
CREATE TABLE holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  amount INT NOT NULL DEFAULT 0 CHECK (amount >= 0),
  UNIQUE (student_id, stock_id)
);

-- ──────────────────────────────────────────
-- 2. 인덱스
-- ──────────────────────────────────────────

CREATE INDEX idx_sessions_teacher ON sessions(teacher_id);
CREATE INDEX idx_sessions_join_code ON sessions(join_code);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_stocks_session ON stocks(session_id);
CREATE INDEX idx_students_session ON students(session_id);
CREATE INDEX idx_bookmarks_student ON bookmarks(student_id);
CREATE INDEX idx_bookmarks_stock ON bookmarks(stock_id);
CREATE INDEX idx_trades_student ON trades(student_id);
CREATE INDEX idx_trades_stock ON trades(stock_id);
CREATE INDEX idx_holdings_student ON holdings(student_id);
CREATE INDEX idx_holdings_stock ON holdings(stock_id);

-- ──────────────────────────────────────────
-- 3. Realtime 활성화
-- ──────────────────────────────────────────
-- Supabase 대시보드에서 아래 테이블의 Realtime을 활성화해야 함:
--   sessions, stocks, students, bookmarks, holdings
--
-- 또는 SQL로:
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE stocks;
ALTER PUBLICATION supabase_realtime ADD TABLE students;
ALTER PUBLICATION supabase_realtime ADD TABLE bookmarks;
ALTER PUBLICATION supabase_realtime ADD TABLE holdings;

-- ──────────────────────────────────────────
-- 4. RPC 함수
-- ──────────────────────────────────────────

-- 4.1 매수
CREATE OR REPLACE FUNCTION buy_stock(
  p_student_id UUID,
  p_stock_id UUID,
  p_amount INT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance INT;
  v_new_balance INT;
  v_session_status TEXT;
  v_session_id UUID;
BEGIN
  -- 학생 잔고 및 세션 상태 확인
  SELECT s.balance, st.session_id INTO v_balance, v_session_id
  FROM students s
  JOIN students st ON st.id = p_student_id
  WHERE s.id = p_student_id
  FOR UPDATE;

  -- 세션이 trading 상태인지 확인
  SELECT status INTO v_session_status
  FROM sessions
  WHERE id = v_session_id;

  IF v_session_status != 'trading' THEN
    RETURN json_build_object('success', false, 'error', 'Trading is not open');
  END IF;

  -- 잔고 부족 체크
  IF v_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- 금액 유효성 체크 (1000 단위)
  IF p_amount <= 0 OR p_amount % 1000 != 0 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  -- 잔고 차감
  v_new_balance := v_balance - p_amount;
  UPDATE students SET balance = v_new_balance WHERE id = p_student_id;

  -- 보유 현황 UPSERT
  INSERT INTO holdings (student_id, stock_id, amount)
  VALUES (p_student_id, p_stock_id, p_amount)
  ON CONFLICT (student_id, stock_id)
  DO UPDATE SET amount = holdings.amount + p_amount;

  -- 거래 기록
  INSERT INTO trades (student_id, stock_id, type, amount)
  VALUES (p_student_id, p_stock_id, 'buy', p_amount);

  RETURN json_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

-- 4.2 매도 (전액)
CREATE OR REPLACE FUNCTION sell_stock(
  p_student_id UUID,
  p_stock_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_amount INT;
  v_new_balance INT;
  v_session_id UUID;
  v_session_status TEXT;
BEGIN
  -- 세션 상태 확인
  SELECT st.session_id INTO v_session_id
  FROM students st WHERE st.id = p_student_id;

  SELECT status INTO v_session_status
  FROM sessions WHERE id = v_session_id;

  IF v_session_status != 'trading' THEN
    RETURN json_build_object('success', false, 'error', 'Trading is not open');
  END IF;

  -- 보유량 확인
  SELECT amount INTO v_amount
  FROM holdings
  WHERE student_id = p_student_id AND stock_id = p_stock_id;

  IF v_amount IS NULL OR v_amount = 0 THEN
    RETURN json_build_object('success', false, 'error', 'No holdings to sell');
  END IF;

  -- 잔고 복구
  UPDATE students
  SET balance = balance + v_amount
  WHERE id = p_student_id
  RETURNING balance INTO v_new_balance;

  -- 보유 삭제
  DELETE FROM holdings
  WHERE student_id = p_student_id AND stock_id = p_stock_id;

  -- 거래 기록
  INSERT INTO trades (student_id, stock_id, type, amount)
  VALUES (p_student_id, p_stock_id, 'sell', v_amount);

  RETURN json_build_object('success', true, 'new_balance', v_new_balance, 'sold_amount', v_amount);
END;
$$;

-- 4.3 정산
CREATE OR REPLACE FUNCTION settle_session(
  p_session_id UUID,
  p_core_stock_ids UUID[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student RECORD;
  v_holding RECORD;
  v_settled_total INT;
  v_results JSON[];
  v_total_invested INT;
  v_core_invested INT;
  v_accuracy NUMERIC;
BEGIN
  -- 핵심 종목 표시
  UPDATE stocks
  SET is_core = true
  WHERE session_id = p_session_id AND id = ANY(p_core_stock_ids);

  -- 학생별 정산
  FOR v_student IN
    SELECT id, nickname, balance FROM students WHERE session_id = p_session_id
  LOOP
    v_settled_total := 0;
    v_total_invested := 0;
    v_core_invested := 0;

    FOR v_holding IN
      SELECT h.amount, h.stock_id, s.is_core
      FROM holdings h
      JOIN stocks s ON s.id = h.stock_id
      WHERE h.student_id = v_student.id
    LOOP
      v_total_invested := v_total_invested + v_holding.amount;

      IF v_holding.is_core THEN
        -- 핵심 종목: ×3
        v_settled_total := v_settled_total + (v_holding.amount * 3);
        v_core_invested := v_core_invested + v_holding.amount;
      ELSE
        -- 비핵심 종목: ×0.5 (내림)
        v_settled_total := v_settled_total + FLOOR(v_holding.amount * 0.5);
      END IF;
    END LOOP;

    -- 최종 잔고 업데이트
    UPDATE students
    SET balance = balance + v_settled_total
    WHERE id = v_student.id;

    -- 정확률 계산
    IF v_total_invested > 0 THEN
      v_accuracy := ROUND((v_core_invested::NUMERIC / v_total_invested) * 100, 1);
    ELSE
      v_accuracy := 0;
    END IF;

    v_results := array_append(v_results, json_build_object(
      'student_id', v_student.id,
      'nickname', v_student.nickname,
      'final_balance', v_student.balance + v_settled_total,
      'accuracy', v_accuracy
    ));
  END LOOP;

  -- 세션 상태 변경
  UPDATE sessions SET status = 'closed' WHERE id = p_session_id;

  RETURN json_build_object(
    'success', true,
    'student_results', to_json(v_results)
  );
END;
$$;

-- ──────────────────────────────────────────
-- 5. Row Level Security (RLS)
-- ──────────────────────────────────────────

-- RLS 활성화
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;

-- teachers: 본인 데이터만 접근
CREATE POLICY "Teachers can view own data"
  ON teachers FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Teachers can insert own data"
  ON teachers FOR INSERT
  WITH CHECK (id = auth.uid());

-- sessions: 교사는 자기 수업, 학생은 참여 중인 수업 조회
CREATE POLICY "Teachers can manage own sessions"
  ON sessions FOR ALL
  USING (teacher_id = auth.uid());

CREATE POLICY "Anyone can view session by join_code"
  ON sessions FOR SELECT
  USING (true);

-- stocks: 해당 세션 참여자 모두 조회 가능
CREATE POLICY "Stocks are viewable by session participants"
  ON stocks FOR SELECT
  USING (true);

CREATE POLICY "Teachers can manage stocks"
  ON stocks FOR ALL
  USING (
    session_id IN (SELECT id FROM sessions WHERE teacher_id = auth.uid())
  );

-- students: 세션 참여 시 INSERT, 본인 데이터 조회
CREATE POLICY "Anyone can join a session"
  ON students FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Students are viewable by session participants"
  ON students FOR SELECT
  USING (true);

CREATE POLICY "Students can update own balance"
  ON students FOR UPDATE
  USING (true);

-- bookmarks: 본인 찜하기 관리, 모두 조회 (교사 대시보드)
CREATE POLICY "Students can manage own bookmarks"
  ON bookmarks FOR ALL
  USING (true);

-- trades: 본인 거래만 INSERT, 모두 조회
CREATE POLICY "Students can insert own trades"
  ON trades FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Trades are viewable"
  ON trades FOR SELECT
  USING (true);

-- holdings: 본인 보유 관리, 모두 조회
CREATE POLICY "Holdings are accessible"
  ON holdings FOR ALL
  USING (true);

-- ──────────────────────────────────────────
-- 6. 수업 코드 생성 헬퍼 함수
-- ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_i INT;
BEGIN
  LOOP
    v_code := '';
    FOR v_i IN 1..6 LOOP
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
    END LOOP;

    -- 활성 세션과 중복 확인
    SELECT EXISTS(
      SELECT 1 FROM sessions
      WHERE join_code = v_code AND status != 'closed'
    ) INTO v_exists;

    IF NOT v_exists THEN
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$;
