-- ====================================================================
-- CARNET DE CRÉDIT NUMÉRIQUE - SCHÉMA POSTGRESQL POUR SUPABASE
-- Compatible avec Supabase SQL Editor, Auth et Row Level Security (RLS)
-- ====================================================================

-- 1. Table des utilisateurs (commerçants)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  store_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table des clients
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  credit_status TEXT NOT NULL DEFAULT 'AUTHORIZED' CHECK (credit_status IN ('AUTHORIZED', 'BLOCKED')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour recherche rapide et unicité par commerçant
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(user_id, phone);

-- 3. Table des crédits accordés
CREATE TABLE IF NOT EXISTS public.credits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  credit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  entry_mode TEXT NOT NULL DEFAULT 'EXPRESS' CHECK (entry_mode IN ('EXPRESS', 'DETAILED')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credits_client_id ON public.credits(client_id);
CREATE INDEX IF NOT EXISTS idx_credits_user_id ON public.credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_due_date ON public.credits(due_date);

-- 4. Table des articles détaillés (pour le mode détaillé)
CREATE TABLE IF NOT EXISTS public.credit_items (
  id TEXT PRIMARY KEY,
  credit_id TEXT NOT NULL REFERENCES public.credits(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price BIGINT NOT NULL CHECK (price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_items_credit_id ON public.credit_items(credit_id);

-- 5. Table des paiements / remboursements
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  credit_id TEXT REFERENCES public.credits(id) ON DELETE SET NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);

-- ====================================================================
-- ACTIVATION DU ROW LEVEL SECURITY (RLS)
-- ====================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Politiques RLS permissives pour les requêtes authentifiées ou avec clé de service
DROP POLICY IF EXISTS "Users can view and edit own profile" ON public.users;
CREATE POLICY "Users can view and edit own profile" ON public.users
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can manage own clients" ON public.clients;
CREATE POLICY "Users can manage own clients" ON public.clients
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can manage own credits" ON public.credits;
CREATE POLICY "Users can manage own credits" ON public.credits
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can manage own credit items" ON public.credit_items;
CREATE POLICY "Users can manage own credit items" ON public.credit_items
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can manage own payments" ON public.payments;
CREATE POLICY "Users can manage own payments" ON public.payments
  FOR ALL USING (true);

-- ====================================================================
-- DONNÉES DE DÉPART (Scénario de test Cheikh)
-- ====================================================================

INSERT INTO public.users (id, phone, name, store_name)
VALUES ('user-cheikh-1', '770000000', 'Cheikh Commerçant', 'Boutique Cheikh')
ON CONFLICT (id) DO NOTHING;

-- Client 1: Mamadou Diallo (25 000 FCFA, 3 jours de retard)
INSERT INTO public.clients (id, user_id, first_name, last_name, phone, credit_status, is_active)
VALUES ('client-1', 'user-cheikh-1', 'Mamadou', 'Diallo', '771234567', 'AUTHORIZED', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.credits (id, user_id, client_id, amount, credit_date, due_date, entry_mode, description)
VALUES ('credit-1', 'user-cheikh-1', 'client-1', 25000, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '3 days', 'EXPRESS', 'Crédit express riz et huile')
ON CONFLICT (id) DO NOTHING;

-- Client 2: Fatou Sow (15 000 FCFA, échéance demain)
INSERT INTO public.clients (id, user_id, first_name, last_name, phone, credit_status, is_active)
VALUES ('client-2', 'user-cheikh-1', 'Fatou', 'Sow', '789876543', 'AUTHORIZED', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.credits (id, user_id, client_id, amount, credit_date, due_date, entry_mode, description)
VALUES ('credit-2', 'user-cheikh-1', 'client-2', 15000, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '1 day', 'EXPRESS', 'Lait, sucre et café')
ON CONFLICT (id) DO NOTHING;

-- Client 3: Moussa Ba (45k crédits, 10k paiements, solde 35k, bloqué)
INSERT INTO public.clients (id, user_id, first_name, last_name, phone, credit_status, is_active)
VALUES ('client-3', 'user-cheikh-1', 'Moussa', 'Ba', '765551234', 'BLOCKED', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.credits (id, user_id, client_id, amount, credit_date, due_date, entry_mode, description)
VALUES ('credit-3', 'user-cheikh-1', 'client-3', 45000, CURRENT_DATE - INTERVAL '35 days', CURRENT_DATE - INTERVAL '20 days', 'EXPRESS', 'Sac de riz 50kg')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.payments (id, user_id, client_id, amount, payment_date, notes)
VALUES ('pay-1', 'user-cheikh-1', 'client-3', 10000, CURRENT_DATE - INTERVAL '15 days', 'Acompte en espèces')
ON CONFLICT (id) DO NOTHING;

-- Client 4: Aïda Ndiaye (8 500 FCFA, échéance dans 15 jours)
INSERT INTO public.clients (id, user_id, first_name, last_name, phone, credit_status, is_active)
VALUES ('client-4', 'user-cheikh-1', 'Aïda', 'Ndiaye', '701112233', 'AUTHORIZED', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.credits (id, user_id, client_id, amount, credit_date, due_date, entry_mode, description)
VALUES ('credit-4', 'user-cheikh-1', 'client-4', 8500, CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '15 days', 'EXPRESS', 'Provisions diverses')
ON CONFLICT (id) DO NOTHING;

-- Client 5: Ousmane Fall (20 000 FCFA crédits, 20 000 FCFA paiements, solde 0)
INSERT INTO public.clients (id, user_id, first_name, last_name, phone, credit_status, is_active)
VALUES ('client-5', 'user-cheikh-1', 'Ousmane', 'Fall', '774448899', 'AUTHORIZED', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.credits (id, user_id, client_id, amount, credit_date, due_date, entry_mode, description)
VALUES ('credit-5', 'user-cheikh-1', 'client-5', 20000, CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '5 days', 'EXPRESS', 'Achats du mois précédent')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.payments (id, user_id, client_id, amount, payment_date, notes)
VALUES ('pay-2', 'user-cheikh-1', 'client-5', 20000, CURRENT_DATE - INTERVAL '4 days', 'Solde complet réglé par Wave')
ON CONFLICT (id) DO NOTHING;
