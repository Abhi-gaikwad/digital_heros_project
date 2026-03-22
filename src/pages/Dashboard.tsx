import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Trophy, LogOut, Plus, Trash2, CreditCard, Gift, Target } from 'lucide-react';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [scores, setScores] = useState<any[]>([]);
  const [newScore, setNewScore] = useState('');
  const [subscription, setSubscription] = useState<any>(null);
  const [charities, setCharities] = useState<any[]>([]);
  const [selectedCharity, setSelectedCharity] = useState<string | null>(null);
  const [donationPct, setDonationPct] = useState(10);
  const [draws, setDraws] = useState<any[]>([]);
  const [winnings, setWinnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    const [scoresRes, subRes, charitiesRes, charitySelRes, drawsRes, winningsRes] = await Promise.all([
      supabase.from('scores').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*').eq('user_id', user!.id).maybeSingle(),
      supabase.from('charities').select('*').eq('active', true),
      supabase.from('charity_selections').select('*').eq('user_id', user!.id).maybeSingle(),
      supabase.from('draws').select('*').order('draw_date', { ascending: false }).limit(5),
      supabase.from('draw_results').select('*, draws(draw_date, numbers)').eq('user_id', user!.id).order('created_at', { ascending: false }),
    ]);
    setScores(scoresRes.data || []);
    setSubscription(subRes.data);
    setCharities(charitiesRes.data || []);
    if (charitySelRes.data) {
      setSelectedCharity(charitySelRes.data.charity_id);
      setDonationPct(charitySelRes.data.donation_percentage);
    }
    setDraws(drawsRes.data || []);
    setWinnings(winningsRes.data || []);
    setLoading(false);
  }

  async function addScore() {
    const score = parseInt(newScore);
    if (isNaN(score) || score < 1 || score > 45) return;

    // If user has 5 scores, delete the oldest
    if (scores.length >= 5) {
      const oldest = scores[scores.length - 1];
      await supabase.from('scores').delete().eq('id', oldest.id);
    }

    await supabase.from('scores').insert({ user_id: user!.id, score_value: score });
    setNewScore('');
    loadData();
  }

  async function deleteScore(id: string) {
    await supabase.from('scores').delete().eq('id', id);
    loadData();
  }

  async function mockSubscribe(plan: 'monthly' | 'yearly') {
    const amount = plan === 'monthly' ? 9.99 : 89.99;
    await supabase.from('subscriptions').upsert({
      user_id: user!.id,
      plan,
      status: 'active',
      amount,
      current_period_end: new Date(Date.now() + (plan === 'monthly' ? 30 : 365) * 86400000).toISOString(),
    }, { onConflict: 'user_id' });
    loadData();
  }

  async function selectCharity(charityId: string) {
    await supabase.from('charity_selections').upsert({
      user_id: user!.id,
      charity_id: charityId,
      donation_percentage: donationPct,
    }, { onConflict: 'user_id' });
    setSelectedCharity(charityId);
    loadData();
  }

  async function updateDonation() {
    if (donationPct < 10) return;
    await supabase.from('charity_selections').update({ donation_percentage: donationPct }).eq('user_id', user!.id);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const isActive = subscription?.status === 'active';

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold">lovable</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.user_metadata?.full_name || user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate('/'); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-8 space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your scores, subscriptions, and charity impact.</p>
        </div>

        {/* Subscription status */}
        {!isActive && (
          <Card className="border-gold/30 bg-gold/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gold" />
                Subscribe to play
              </CardTitle>
              <CardDescription>Choose a plan to enter scores and participate in monthly draws.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button variant="gold" onClick={() => mockSubscribe('monthly')}>
                Monthly — £9.99/mo
              </Button>
              <Button variant="outline" onClick={() => mockSubscribe('yearly')}>
                Yearly — £89.99/yr (save 25%)
              </Button>
            </CardContent>
          </Card>
        )}

        {isActive && (
          <div className="flex items-center gap-3">
            <Badge className="bg-primary/10 text-primary border-0 px-3 py-1">
              {subscription.plan === 'monthly' ? 'Monthly' : 'Yearly'} subscriber
            </Badge>
            <span className="text-sm text-muted-foreground">
              Renews {new Date(subscription.current_period_end).toLocaleDateString()}
            </span>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Scores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Your scores
              </CardTitle>
              <CardDescription>Enter up to 5 scores (1–45). These are your draw numbers.</CardDescription>
            </CardHeader>
            <CardContent>
              {isActive ? (
                <>
                  <div className="flex gap-2 mb-4">
                    <Input
                      type="number"
                      min={1}
                      max={45}
                      placeholder="Enter score (1-45)"
                      value={newScore}
                      onChange={(e) => setNewScore(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addScore()}
                    />
                    <Button onClick={addScore} disabled={scores.length >= 5 && !newScore}>
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                  {scores.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No scores yet. Add your first score above.</p>
                  ) : (
                    <div className="space-y-2">
                      {scores.map((s) => (
                        <div key={s.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold font-display tabular-nums text-primary">{s.score_value}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(s.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => deleteScore(s.id)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-3">{scores.length}/5 scores entered</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Subscribe to start entering scores.</p>
              )}
            </CardContent>
          </Card>

          {/* Charity selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Your charity
              </CardTitle>
              <CardDescription>Choose where your donation goes (min 10% of winnings).</CardDescription>
            </CardHeader>
            <CardContent>
              {charities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No charities available yet.</p>
              ) : (
                <div className="space-y-3">
                  {charities.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectCharity(c.id)}
                      className={`w-full text-left rounded-lg border-2 p-4 transition-all hover:shadow-sm active:scale-[0.98] ${
                        selectedCharity === c.id ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">{c.description}</div>
                    </button>
                  ))}
                  <div className="flex items-center gap-3 mt-4">
                    <label className="text-sm font-medium">Donation %</label>
                    <Input
                      type="number"
                      min={10}
                      max={100}
                      value={donationPct}
                      onChange={(e) => setDonationPct(parseInt(e.target.value) || 10)}
                      onBlur={updateDonation}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">min 10%</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent draws & winnings */}
        <div className="grid lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-gold" />
                Recent draws
              </CardTitle>
            </CardHeader>
            <CardContent>
              {draws.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No draws yet.</p>
              ) : (
                <div className="space-y-3">
                  {draws.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                      <span className="text-sm">{new Date(d.draw_date).toLocaleDateString()}</span>
                      <div className="flex gap-2">
                        {(d.numbers as number[]).map((n: number, i: number) => (
                          <span key={i} className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold tabular-nums">
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-gold" />
                Your winnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {winnings.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No winnings yet. Keep playing!</p>
              ) : (
                <div className="space-y-3">
                  {winnings.map((w) => (
                    <div key={w.id} className="flex items-center justify-between rounded-lg bg-gold/5 border border-gold/20 px-4 py-3">
                      <div>
                        <span className="font-semibold">{w.matches_count} matches</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {new Date(w.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary tabular-nums">£{w.prize_amount?.toFixed(2)}</div>
                        <Badge variant={w.verification_status === 'approved' ? 'default' : 'secondary'} className="text-xs">
                          {w.verification_status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
