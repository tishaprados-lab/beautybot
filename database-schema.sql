-- ============================================================
-- BeautyBot — Schema Supabase
-- Corre isto no SQL Editor do Supabase:
-- supabase.com/dashboard/project/cdhtcfvvxktouvusyosu/sql/new
-- ============================================================

-- ── TABELA PROFILES ──
-- Criada automaticamente quando um utilizador se regista
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  clinic_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  plan TEXT DEFAULT 'trial' CHECK (plan IN ('trial', 'essential', 'premium', 'agency')),
  plan_status TEXT DEFAULT 'trial' CHECK (plan_status IN ('trial', 'active', 'expired', 'cancelled')),
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  chatbot_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── TRIGGER: criar profile automaticamente ao registar ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, clinic_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'clinic_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── TRIGGER: actualizar updated_at ──
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

-- ── ROW LEVEL SECURITY ──
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Cada utilizador vê só o seu próprio perfil
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Cada utilizador actualiza só o seu próprio perfil
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins vêem todos os perfis
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins actualizam todos os perfis
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── TABELA: CHATBOT CONFIGS (histórico) ──
CREATE TABLE IF NOT EXISTS public.chatbot_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_data JSONB DEFAULT '{}'::jsonb,
  message_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chatbot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own sessions"
  ON public.chatbot_sessions FOR SELECT
  USING (profile_id = auth.uid());

-- ── CRIAR O TEU UTILIZADOR ADMIN ──
-- DEPOIS de te registares no site, corre este SQL substituindo o teu email:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'tishaprados@gmail.com';

-- ── VERIFICAR SE FICOU BEM ──
SELECT COUNT(*) as total_users FROM public.profiles;
SELECT * FROM public.profiles LIMIT 5;
