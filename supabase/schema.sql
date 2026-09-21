-- ====================================================================
-- CARNET DE CRÉDIT NUMÉRIQUE - SCHÉMA OFFICIEL POSTGRESQL (SUPABASE)
-- Architecture cible : Source unique de vérité en production
-- Intégrité financière absolue, transactions atomiques, anti-doublon (idempotence)
-- ====================================================================

-- Extension requise pour gen_random_uuid() si non présente par défaut
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 1. TABLES FONDAMENTALES & CONTRAINTES STRICTES
-- ====================================================================

-- Table des utilisateurs (commerçants)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  store_name TEXT NOT NULL,
  pin TEXT NOT NULL DEFAULT '1234',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des clients
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  credit_status TEXT NOT NULL DEFAULT 'AUTHORIZED' CHECK (credit_status IN ('AUTHORIZED', 'BLOCKED')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Contrainte d'unicité : un commerçant ne peut pas créer deux clients actifs avec le même numéro
  CONSTRAINT uq_clients_user_phone UNIQUE (user_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_active ON public.clients(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(user_id, phone);

-- Table des crédits accordés
CREATE TABLE IF NOT EXISTS public.credits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  amount BIGINT NOT NULL CHECK (amount > 0),
  credit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  entry_mode TEXT NOT NULL DEFAULT 'EXPRESS' CHECK (entry_mode IN ('EXPRESS', 'DETAILED')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credits_user_id ON public.credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_client_id ON public.credits(client_id);
CREATE INDEX IF NOT EXISTS idx_credits_due_date ON public.credits(due_date);
CREATE INDEX IF NOT EXISTS idx_credits_client_date ON public.credits(client_id, credit_date DESC);

-- Table des articles détaillés (mode DETAILED)
CREATE TABLE IF NOT EXISTS public.credit_items (
  id TEXT PRIMARY KEY,
  credit_id TEXT NOT NULL REFERENCES public.credits(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1.0 CHECK (quantity > 0),
  price BIGINT NOT NULL CHECK (price >= 0),
  total_price BIGINT NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_items_credit_id ON public.credit_items(credit_id);

-- Table des paiements / remboursements
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  credit_id TEXT REFERENCES public.credits(id) ON DELETE SET NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Contrainte d'unicité d'idempotence : un même commerçant ne peut pas réexécuter le même paiement avec la même clé
  CONSTRAINT uq_payments_user_idempotency UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_date ON public.payments(client_id, payment_date DESC);

-- Table dédiée au journal d'idempotence (pour toutes les opérations sensibles)
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_id TEXT,
  response_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idempotency_user ON public.idempotency_keys(user_id, created_at DESC);

-- ====================================================================
-- 2. VUE D'AGRÉGATION FINANCIÈRE DES CLIENTS
-- ====================================================================

CREATE OR REPLACE VIEW public.v_client_balances AS
SELECT
  c.id AS client_id,
  c.user_id,
  c.first_name,
  c.last_name,
  c.phone,
  c.credit_status,
  c.is_active,
  c.created_at,
  COALESCE(cr.total_credits, 0) AS total_credits,
  COALESCE(py.total_payments, 0) AS total_payments,
  GREATEST(0, COALESCE(cr.total_credits, 0) - COALESCE(py.total_payments, 0)) AS balance,
  CASE
    WHEN (COALESCE(cr.total_credits, 0) - COALESCE(py.total_payments, 0)) <= 0 THEN 'SETTLED'
    WHEN cr.min_due_date < CURRENT_DATE THEN 'OVERDUE'
    WHEN cr.min_due_date <= (CURRENT_DATE + INTERVAL '2 days')::date THEN 'DUE_SOON'
    ELSE 'UP_TO_DATE'
  END AS debt_status,
  cr.min_due_date AS earliest_due_date
FROM public.clients c
LEFT JOIN (
  SELECT
    client_id,
    SUM(amount) AS total_credits,
    MIN(due_date) AS min_due_date
  FROM public.credits
  GROUP BY client_id
) cr ON cr.client_id = c.id
LEFT JOIN (
  SELECT
    client_id,
    SUM(amount) AS total_payments
  FROM public.payments
  GROUP BY client_id
) py ON py.client_id = c.id;

-- ====================================================================
-- 3. FONCTIONS PL/PGSQL TRANSACTIONNELLES & RÈGLES FINANCIÈRES
-- ====================================================================

-- --------------------------------------------------------------------
-- A. ENREGISTREMENT TRANSACTIONNEL D'UN PAIEMENT (AVEC IDEMPOTENCE)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_record_payment(
  p_user_id TEXT,
  p_client_id TEXT,
  p_amount BIGINT,
  p_idempotency_key TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_credit_id TEXT DEFAULT NULL,
  p_payment_date DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client RECORD;
  v_total_credits BIGINT := 0;
  v_total_payments BIGINT := 0;
  v_current_balance BIGINT := 0;
  v_new_balance BIGINT := 0;
  v_payment_id TEXT;
  v_existing_idempotency RECORD;
  v_result JSONB;
BEGIN
  -- 1. Vérification d'idempotence immédiate
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT * INTO v_existing_idempotency
    FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND user_id = p_user_id;

    IF FOUND THEN
      -- Retourner directement le résultat de l'opération précédente sans doublon
      RETURN jsonb_build_object(
        'status', 'REPLAY',
        'message', 'Opération déjà traitée (idempotence).',
        'data', v_existing_idempotency.response_payload
      );
    END IF;
  END IF;

  -- 2. Validation du montant
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Le montant du paiement doit être supérieur à zéro.'
      USING ERRCODE = '22003';
  END IF;

  -- 3. Verrouillage strict du client (FOR UPDATE) pour empêcher les conditions de course
  SELECT id, first_name, last_name, credit_status, is_active
  INTO v_client
  FROM public.clients
  WHERE id = p_client_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLIENT_NOT_FOUND: Client introuvable ou non autorisé.'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_client.is_active THEN
    RAISE EXCEPTION 'CLIENT_INACTIVE: Impossible d''enregistrer un paiement pour un client inactif.'
      USING ERRCODE = '22000';
  END IF;

  -- 4. Calcul du solde en temps réel au sein de la transaction verrouillée
  SELECT COALESCE(SUM(amount), 0) INTO v_total_credits
  FROM public.credits
  WHERE client_id = p_client_id AND user_id = p_user_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_payments
  FROM public.payments
  WHERE client_id = p_client_id AND user_id = p_user_id;

  v_current_balance := v_total_credits - v_total_payments;

  -- 5. Vérification financière : interdiction formelle du surpaiement / solde négatif
  IF p_amount > v_current_balance THEN
    RAISE EXCEPTION 'PAYMENT_EXCEEDS_BALANCE: Le montant payé (% FCFA) dépasse le solde restant dû (% FCFA). Le solde ne peut pas être négatif.',
      p_amount, v_current_balance
      USING ERRCODE = '22003';
  END IF;

  -- 6. Insertion du paiement
  v_payment_id := 'pay-' || gen_random_uuid()::text;

  INSERT INTO public.payments (
    id,
    user_id,
    client_id,
    credit_id,
    amount,
    payment_date,
    notes,
    idempotency_key,
    created_at
  ) VALUES (
    v_payment_id,
    p_user_id,
    p_client_id,
    p_credit_id,
    p_amount,
    COALESCE(p_payment_date, CURRENT_DATE),
    p_notes,
    NULLIF(p_idempotency_key, ''),
    NOW()
  );

  v_new_balance := v_current_balance - p_amount;

  -- 7. Préparation du payload de réponse
  v_result := jsonb_build_object(
    'payment_id', v_payment_id,
    'user_id', p_user_id,
    'client_id', p_client_id,
    'credit_id', p_credit_id,
    'amount', p_amount,
    'payment_date', COALESCE(p_payment_date, CURRENT_DATE),
    'notes', p_notes,
    'previous_balance', v_current_balance,
    'new_balance', v_new_balance,
    'is_settled', (v_new_balance = 0),
    'created_at', NOW()
  );

  -- 8. Enregistrement dans le journal d'idempotence si une clé a été fournie
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO public.idempotency_keys (
      key,
      user_id,
      action,
      resource_id,
      response_payload,
      created_at
    ) VALUES (
      p_idempotency_key,
      p_user_id,
      'RECORD_PAYMENT',
      v_payment_id,
      v_result,
      NOW()
    );
  END IF;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'data', v_result
  );
END;
$$;

-- --------------------------------------------------------------------
-- B. ENREGISTREMENT TRANSACTIONNEL D'UN CRÉDIT SIMPLE
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_record_credit_simple(
  p_user_id TEXT,
  p_client_id TEXT,
  p_amount BIGINT,
  p_due_date DATE,
  p_description TEXT DEFAULT NULL,
  p_force_override BOOLEAN DEFAULT FALSE,
  p_credit_date DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client RECORD;
  v_credit_id TEXT;
  v_total_credits BIGINT := 0;
  v_total_payments BIGINT := 0;
  v_new_balance BIGINT := 0;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Le montant du crédit doit être supérieur à zéro.'
      USING ERRCODE = '22003';
  END IF;

  IF p_due_date IS NULL THEN
    RAISE EXCEPTION 'INVALID_DUE_DATE: La date d''échéance est obligatoire.'
      USING ERRCODE = '22000';
  END IF;

  -- Verrouillage client
  SELECT id, first_name, last_name, credit_status, is_active
  INTO v_client
  FROM public.clients
  WHERE id = p_client_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLIENT_NOT_FOUND: Client introuvable ou non autorisé.'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_client.is_active THEN
    RAISE EXCEPTION 'CLIENT_INACTIVE: Impossible d''octroyer un crédit à un client inactif.'
      USING ERRCODE = '22000';
  END IF;

  IF v_client.credit_status = 'BLOCKED' AND NOT p_force_override THEN
    RAISE EXCEPTION 'CLIENT_BLOCKED: Crédit refusé. Le client % % est actuellement bloqué.',
      v_client.first_name, v_client.last_name
      USING ERRCODE = '22000';
  END IF;

  v_credit_id := 'credit-' || gen_random_uuid()::text;

  INSERT INTO public.credits (
    id,
    user_id,
    client_id,
    amount,
    credit_date,
    due_date,
    entry_mode,
    description,
    created_at,
    updated_at
  ) VALUES (
    v_credit_id,
    p_user_id,
    p_client_id,
    p_amount,
    COALESCE(p_credit_date, CURRENT_DATE),
    p_due_date,
    'EXPRESS',
    p_description,
    NOW(),
    NOW()
  );

  SELECT COALESCE(SUM(amount), 0) INTO v_total_credits FROM public.credits WHERE client_id = p_client_id AND user_id = p_user_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_total_payments FROM public.payments WHERE client_id = p_client_id AND user_id = p_user_id;
  v_new_balance := v_total_credits - v_total_payments;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'data', jsonb_build_object(
      'credit_id', v_credit_id,
      'user_id', p_user_id,
      'client_id', p_client_id,
      'amount', p_amount,
      'credit_date', COALESCE(p_credit_date, CURRENT_DATE),
      'due_date', p_due_date,
      'entry_mode', 'EXPRESS',
      'description', p_description,
      'new_balance', v_new_balance
    )
  );
END;
$$;

-- --------------------------------------------------------------------
-- C. ENREGISTREMENT TRANSACTIONNEL D'UN CRÉDIT DÉTAILLÉ (AVEC ARTICLES)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_record_credit_detailed(
  p_user_id TEXT,
  p_client_id TEXT,
  p_amount BIGINT,
  p_due_date DATE,
  p_items JSONB,
  p_description TEXT DEFAULT NULL,
  p_force_override BOOLEAN DEFAULT FALSE,
  p_credit_date DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client RECORD;
  v_credit_id TEXT;
  v_item RECORD;
  v_sum_items BIGINT := 0;
  v_total_credits BIGINT := 0;
  v_total_payments BIGINT := 0;
  v_new_balance BIGINT := 0;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Le montant du crédit doit être supérieur à zéro.'
      USING ERRCODE = '22003';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'INVALID_ITEMS: Le mode détaillé requiert au moins un article.'
      USING ERRCODE = '22000';
  END IF;

  -- Vérification arithmétique de la somme des articles
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(name TEXT, quantity NUMERIC, price BIGINT)
  LOOP
    IF v_item.name IS NULL OR trim(v_item.name) = '' THEN
      RAISE EXCEPTION 'INVALID_ITEM_NAME: Le nom de chaque article est obligatoire.' USING ERRCODE = '22000';
    END IF;
    IF v_item.price < 0 THEN
      RAISE EXCEPTION 'INVALID_ITEM_PRICE: Le prix d''un article ne peut pas être négatif.' USING ERRCODE = '22003';
    END IF;
    v_sum_items := v_sum_items + (v_item.price * COALESCE(v_item.quantity, 1));
  END LOOP;

  IF v_sum_items <> p_amount THEN
    RAISE EXCEPTION 'ITEMS_SUM_MISMATCH: La somme des articles (% FCFA) ne correspond pas au montant déclaré (% FCFA).',
      v_sum_items, p_amount
      USING ERRCODE = '22000';
  END IF;

  -- Verrouillage client
  SELECT id, first_name, last_name, credit_status, is_active
  INTO v_client
  FROM public.clients
  WHERE id = p_client_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLIENT_NOT_FOUND: Client introuvable ou non autorisé.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_client.is_active THEN
    RAISE EXCEPTION 'CLIENT_INACTIVE: Impossible d''octroyer un crédit à un client inactif.' USING ERRCODE = '22000';
  END IF;

  IF v_client.credit_status = 'BLOCKED' AND NOT p_force_override THEN
    RAISE EXCEPTION 'CLIENT_BLOCKED: Crédit refusé. Le client % % est bloqué.', v_client.first_name, v_client.last_name USING ERRCODE = '22000';
  END IF;

  v_credit_id := 'credit-' || gen_random_uuid()::text;

  INSERT INTO public.credits (
    id,
    user_id,
    client_id,
    amount,
    credit_date,
    due_date,
    entry_mode,
    description,
    created_at,
    updated_at
  ) VALUES (
    v_credit_id,
    p_user_id,
    p_client_id,
    p_amount,
    COALESCE(p_credit_date, CURRENT_DATE),
    p_due_date,
    'DETAILED',
    p_description,
    NOW(),
    NOW()
  );

  -- Insertion atomique des articles
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(name TEXT, quantity NUMERIC, price BIGINT)
  LOOP
    INSERT INTO public.credit_items (
      id,
      credit_id,
      name,
      quantity,
      price,
      total_price,
      created_at
    ) VALUES (
      'item-' || gen_random_uuid()::text,
      v_credit_id,
      v_item.name,
      COALESCE(v_item.quantity, 1.0),
      v_item.price,
      v_item.price * COALESCE(v_item.quantity, 1.0),
      NOW()
    );
  END LOOP;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_credits FROM public.credits WHERE client_id = p_client_id AND user_id = p_user_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_total_payments FROM public.payments WHERE client_id = p_client_id AND user_id = p_user_id;
  v_new_balance := v_total_credits - v_total_payments;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'data', jsonb_build_object(
      'credit_id', v_credit_id,
      'user_id', p_user_id,
      'client_id', p_client_id,
      'amount', p_amount,
      'credit_date', COALESCE(p_credit_date, CURRENT_DATE),
      'due_date', p_due_date,
      'entry_mode', 'DETAILED',
      'description', p_description,
      'new_balance', v_new_balance,
      'items_count', jsonb_array_length(p_items)
    )
  );
END;
$$;

-- --------------------------------------------------------------------
-- D. MODIFICATION D'UN CRÉDIT (AVEC GARANTIE DES PAIEMENTS ANTÉRIEURS)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_update_credit(
  p_user_id TEXT,
  p_credit_id TEXT,
  p_new_amount BIGINT,
  p_new_due_date DATE DEFAULT NULL,
  p_new_description TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credit RECORD;
  v_total_credits BIGINT := 0;
  v_total_payments BIGINT := 0;
  v_projected_credits BIGINT := 0;
  v_new_balance BIGINT := 0;
BEGIN
  IF p_new_amount IS NULL OR p_new_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Le montant du crédit doit être supérieur à zéro.' USING ERRCODE = '22003';
  END IF;

  -- Verrouillage du crédit
  SELECT * INTO v_credit
  FROM public.credits
  WHERE id = p_credit_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CREDIT_NOT_FOUND: Crédit introuvable ou non autorisé.' USING ERRCODE = 'P0002';
  END IF;

  -- Verrouillage du client rattaché
  PERFORM id FROM public.clients WHERE id = v_credit.client_id FOR UPDATE;

  -- Vérification financière globale
  SELECT COALESCE(SUM(amount), 0) INTO v_total_credits FROM public.credits WHERE client_id = v_credit.client_id AND user_id = p_user_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_total_payments FROM public.payments WHERE client_id = v_credit.client_id AND user_id = p_user_id;

  v_projected_credits := v_total_credits - v_credit.amount + p_new_amount;

  IF v_projected_credits < v_total_payments THEN
    RAISE EXCEPTION 'CREDIT_LOWER_THAN_PAYMENTS: Impossible de réduire le crédit à % FCFA car le total des paiements déjà versés (% FCFA) dépasserait le nouveau total des crédits (% FCFA).',
      p_new_amount, v_total_payments, v_projected_credits
      USING ERRCODE = '22003';
  END IF;

  UPDATE public.credits
  SET
    amount = p_new_amount,
    due_date = COALESCE(p_new_due_date, due_date),
    description = COALESCE(p_new_description, description),
    updated_at = NOW()
  WHERE id = p_credit_id;

  v_new_balance := v_projected_credits - v_total_payments;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'data', jsonb_build_object(
      'credit_id', p_credit_id,
      'old_amount', v_credit.amount,
      'new_amount', p_new_amount,
      'new_balance', v_new_balance
    )
  );
END;
$$;

-- --------------------------------------------------------------------
-- E. SUPPRESSION D'UN CRÉDIT (AVEC GARANTIE DES PAIEMENTS RESTANTS)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_delete_credit(
  p_user_id TEXT,
  p_credit_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credit RECORD;
  v_total_credits BIGINT := 0;
  v_total_payments BIGINT := 0;
  v_projected_credits BIGINT := 0;
  v_new_balance BIGINT := 0;
BEGIN
  SELECT * INTO v_credit
  FROM public.credits
  WHERE id = p_credit_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CREDIT_NOT_FOUND: Crédit introuvable ou non autorisé.' USING ERRCODE = 'P0002';
  END IF;

  PERFORM id FROM public.clients WHERE id = v_credit.client_id FOR UPDATE;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_credits FROM public.credits WHERE client_id = v_credit.client_id AND user_id = p_user_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_total_payments FROM public.payments WHERE client_id = v_credit.client_id AND user_id = p_user_id;

  v_projected_credits := v_total_credits - v_credit.amount;

  IF v_projected_credits < v_total_payments THEN
    RAISE EXCEPTION 'CANNOT_DELETE_CREDIT_PAYMENT_EXCEEDS: Impossible de supprimer ce crédit (% FCFA) car les paiements déjà enregistrés (% FCFA) dépasseraient le total des crédits restants (% FCFA).',
      v_credit.amount, v_total_payments, v_projected_credits
      USING ERRCODE = '22003';
  END IF;

  DELETE FROM public.credits WHERE id = p_credit_id;

  v_new_balance := v_projected_credits - v_total_payments;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'data', jsonb_build_object(
      'deleted_credit_id', p_credit_id,
      'client_id', v_credit.client_id,
      'deleted_amount', v_credit.amount,
      'new_balance', v_new_balance
    )
  );
END;
$$;

-- --------------------------------------------------------------------
-- F. MODIFICATION D'UN PAIEMENT (AVEC CONTRÔLE DE SOLDE)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_update_payment(
  p_user_id TEXT,
  p_payment_id TEXT,
  p_new_amount BIGINT,
  p_new_payment_date DATE DEFAULT NULL,
  p_new_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment RECORD;
  v_total_credits BIGINT := 0;
  v_total_payments BIGINT := 0;
  v_projected_payments BIGINT := 0;
  v_new_balance BIGINT := 0;
BEGIN
  IF p_new_amount IS NULL OR p_new_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Le montant du paiement doit être supérieur à zéro.' USING ERRCODE = '22003';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_NOT_FOUND: Paiement introuvable ou non autorisé.' USING ERRCODE = 'P0002';
  END IF;

  PERFORM id FROM public.clients WHERE id = v_payment.client_id FOR UPDATE;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_credits FROM public.credits WHERE client_id = v_payment.client_id AND user_id = p_user_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_total_payments FROM public.payments WHERE client_id = v_payment.client_id AND user_id = p_user_id;

  v_projected_payments := v_total_payments - v_payment.amount + p_new_amount;

  IF v_projected_payments > v_total_credits THEN
    RAISE EXCEPTION 'PAYMENT_EXCEEDS_BALANCE: Le montant modifié porterait le cumul des paiements à % FCFA, dépassant le total des crédits (% FCFA).',
      v_projected_payments, v_total_credits
      USING ERRCODE = '22003';
  END IF;

  UPDATE public.payments
  SET
    amount = p_new_amount,
    payment_date = COALESCE(p_new_payment_date, payment_date),
    notes = COALESCE(p_new_notes, notes)
  WHERE id = p_payment_id;

  v_new_balance := v_total_credits - v_projected_payments;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'data', jsonb_build_object(
      'payment_id', p_payment_id,
      'old_amount', v_payment.amount,
      'new_amount', p_new_amount,
      'new_balance', v_new_balance
    )
  );
END;
$$;

-- --------------------------------------------------------------------
-- G. SUPPRESSION D'UN PAIEMENT
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_delete_payment(
  p_user_id TEXT,
  p_payment_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment RECORD;
  v_total_credits BIGINT := 0;
  v_total_payments BIGINT := 0;
  v_new_balance BIGINT := 0;
BEGIN
  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_NOT_FOUND: Paiement introuvable ou non autorisé.' USING ERRCODE = 'P0002';
  END IF;

  PERFORM id FROM public.clients WHERE id = v_payment.client_id FOR UPDATE;

  DELETE FROM public.payments WHERE id = p_payment_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_credits FROM public.credits WHERE client_id = v_payment.client_id AND user_id = p_user_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_total_payments FROM public.payments WHERE client_id = v_payment.client_id AND user_id = p_user_id;
  v_new_balance := v_total_credits - v_total_payments;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'data', jsonb_build_object(
      'deleted_payment_id', p_payment_id,
      'client_id', v_payment.client_id,
      'deleted_amount', v_payment.amount,
      'new_balance', v_new_balance
    )
  );
END;
$$;

-- --------------------------------------------------------------------
-- H. SUPPRESSION SÉCURISÉE D'UN CLIENT (INTERDICTION SI DETTE ACTIVE)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_delete_client_safe(
  p_user_id TEXT,
  p_client_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client RECORD;
  v_total_credits BIGINT := 0;
  v_total_payments BIGINT := 0;
  v_balance BIGINT := 0;
BEGIN
  SELECT * INTO v_client
  FROM public.clients
  WHERE id = p_client_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLIENT_NOT_FOUND: Client introuvable ou non autorisé.' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_credits FROM public.credits WHERE client_id = p_client_id AND user_id = p_user_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_total_payments FROM public.payments WHERE client_id = p_client_id AND user_id = p_user_id;
  v_balance := v_total_credits - v_total_payments;

  IF v_balance > 0 THEN
    RAISE EXCEPTION 'CANNOT_DELETE_ACTIVE_DEBT: Impossible de supprimer un client ayant une dette active (% FCFA restant dus).',
      v_balance
      USING ERRCODE = '22000';
  END IF;

  -- Désactivation logique (Soft Delete) préservant l'intégrité de l'historique
  UPDATE public.clients
  SET is_active = FALSE, updated_at = NOW()
  WHERE id = p_client_id;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'data', jsonb_build_object(
      'client_id', p_client_id,
      'first_name', v_client.first_name,
      'last_name', v_client.last_name,
      'is_active', FALSE
    )
  );
END;
$$;

-- ====================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ====================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own profile" ON public.users;
CREATE POLICY "Users can manage own profile" ON public.users
  FOR ALL USING (auth.uid()::text = id OR current_setting('role') = 'service_role');

DROP POLICY IF EXISTS "Users can manage own clients" ON public.clients;
CREATE POLICY "Users can manage own clients" ON public.clients
  FOR ALL USING (auth.uid()::text = user_id OR current_setting('role') = 'service_role');

DROP POLICY IF EXISTS "Users can manage own credits" ON public.credits;
CREATE POLICY "Users can manage own credits" ON public.credits
  FOR ALL USING (auth.uid()::text = user_id OR current_setting('role') = 'service_role');

DROP POLICY IF EXISTS "Users can manage own credit items" ON public.credit_items;
CREATE POLICY "Users can manage own credit items" ON public.credit_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.credits c
      WHERE c.id = credit_items.credit_id
      AND (c.user_id = auth.uid()::text OR current_setting('role') = 'service_role')
    )
  );

DROP POLICY IF EXISTS "Users can manage own payments" ON public.payments;
CREATE POLICY "Users can manage own payments" ON public.payments
  FOR ALL USING (auth.uid()::text = user_id OR current_setting('role') = 'service_role');

DROP POLICY IF EXISTS "Users can manage own idempotency" ON public.idempotency_keys;
CREATE POLICY "Users can manage own idempotency" ON public.idempotency_keys
  FOR ALL USING (auth.uid()::text = user_id OR current_setting('role') = 'service_role');
