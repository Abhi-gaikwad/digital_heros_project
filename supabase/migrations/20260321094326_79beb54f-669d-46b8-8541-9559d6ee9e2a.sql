
-- Roles system
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by all authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled')),
  amount NUMERIC(10,2) NOT NULL,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own subscription" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins read all subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Scores
CREATE TABLE public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score_value INTEGER NOT NULL CHECK (score_value >= 1 AND score_value <= 45),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own scores" ON public.scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own scores" ON public.scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own scores" ON public.scores FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins read all scores" ON public.scores FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Charities
CREATE TABLE public.charities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.charities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read charities" ON public.charities FOR SELECT USING (true);
CREATE POLICY "Admins insert charities" ON public.charities FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update charities" ON public.charities FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete charities" ON public.charities FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Charity selections
CREATE TABLE public.charity_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  charity_id UUID REFERENCES public.charities(id) NOT NULL,
  donation_percentage INTEGER NOT NULL DEFAULT 10 CHECK (donation_percentage >= 10 AND donation_percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.charity_selections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own charity selection" ON public.charity_selections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own charity selection" ON public.charity_selections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own charity selection" ON public.charity_selections FOR UPDATE USING (auth.uid() = user_id);

-- Draws
CREATE TABLE public.draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_date TIMESTAMPTZ NOT NULL,
  numbers INTEGER[] NOT NULL,
  status TEXT DEFAULT 'completed',
  prize_pool NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read draws" ON public.draws FOR SELECT USING (true);
CREATE POLICY "Admins insert draws" ON public.draws FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update draws" ON public.draws FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Draw results
CREATE TABLE public.draw_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id UUID REFERENCES public.draws(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  matches_count INTEGER NOT NULL,
  matched_numbers INTEGER[],
  prize_amount NUMERIC(10,2),
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
  proof_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.draw_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own results" ON public.draw_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins read all results" ON public.draw_results FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert results" ON public.draw_results FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update results" ON public.draw_results FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_charity_selections_updated_at BEFORE UPDATE ON public.charity_selections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for winner proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('winner-proofs', 'winner-proofs', false);
CREATE POLICY "Users upload own proofs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'winner-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users read own proofs" ON storage.objects FOR SELECT USING (bucket_id = 'winner-proofs' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));
