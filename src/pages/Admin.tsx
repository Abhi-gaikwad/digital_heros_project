import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Users, Trophy, Building, Plus, Play, Check, X, LogOut } from 'lucide-react';

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [charities, setCharities] = useState<any[]>([]);
  const [draws, setDraws] = useState<any[]>([]);
  const [winners, setWinners] = useState<any[]>([]);
  const [newCharity, setNewCharity] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [drawRunning, setDrawRunning] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [usersRes, charitiesRes, drawsRes, winnersRes] = await Promise.all([
      supabase.from('profiles').select('*, subscriptions(plan, status)'),
      supabase.from('charities').select('*').order('created_at', { ascending: false }),
      supabase.from('draws').select('*').order('draw_date', { ascending: false }),
      supabase.from('draw_results').select('*, profiles(full_name, email)').order('created_at', { ascending: false }).limit(50),
    ]);
    setUsers(usersRes.data || []);
    setCharities(charitiesRes.data || []);
    setDraws(drawsRes.data || []);
    setWinners(winnersRes.data || []);
    setLoading(false);
  }

  async function addCharity() {
    if (!newCharity.name.trim()) return;
    await supabase.from('charities').insert({ name: newCharity.name, description: newCharity.description, active: true });
    setNewCharity({ name: '', description: '' });
    loadAll();
  }

  async function toggleCharity(id: string, active: boolean) {
    await supabase.from('charities').update({ active: !active }).eq('id', id);
    loadAll();
  }

  async function runDraw() {
    setDrawRunning(true);
    // Generate 5 random numbers 1-45
    const numbers: number[] = [];
    while (numbers.length < 5) {
      const n = Math.floor(Math.random() * 45) + 1;
      if (!numbers.includes(n)) numbers.push(n);
    }
    numbers.sort((a, b) => a - b);

    // Create draw
    const { data: draw } = await supabase.from('draws').insert({
      draw_date: new Date().toISOString(),
      numbers,
      status: 'completed',
    }).select().single();

    if (!draw) { setDrawRunning(false); return; }

    // Get all active users' scores
    const { data: allScores } = await supabase.from('scores').select('user_id, score_value');
    if (!allScores) { setDrawRunning(false); return; }

    // Group scores by user
    const userScores: Record<string, number[]> = {};
    allScores.forEach((s) => {
      if (!userScores[s.user_id]) userScores[s.user_id] = [];
      userScores[s.user_id].push(s.score_value);
    });

    // Calculate prize pool (mock: count active subs)
    const { count } = await supabase.from('subscriptions').select('id', { count: 'exact' }).eq('status', 'active');
    const prizePool = (count || 0) * 9.99;

    // Check matches and create results
    const results: any[] = [];
    for (const [userId, uScores] of Object.entries(userScores)) {
      const matches = uScores.filter((s) => numbers.includes(s)).length;
      if (matches >= 3) {
        let sharePercent = matches === 5 ? 0.4 : matches === 4 ? 0.35 : 0.25;
        results.push({
          draw_id: draw.id,
          user_id: userId,
          matches_count: matches,
          matched_numbers: uScores.filter((s) => numbers.includes(s)),
          prize_amount: prizePool * sharePercent,
          verification_status: 'pending',
        });
      }
    }

    if (results.length > 0) {
      await supabase.from('draw_results').insert(results);
    }

    setDrawRunning(false);
    loadAll();
  }

  async function updateVerification(id: string, status: 'approved' | 'rejected') {
    await supabase.from('draw_results').update({
      verification_status: status,
      payment_status: status === 'approved' ? 'pending' : 'cancelled',
    }).eq('id', id);
    loadAll();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold">GolfGive</span>
            <Badge variant="secondary" className="ml-2">Admin</Badge>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild><Link to="/dashboard">User view</Link></Button>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </nav>

      <div className="container py-8">
        <h1 className="font-display text-3xl font-bold mb-8">Admin panel</h1>

        <Tabs defaultValue="users">
          <TabsList className="mb-6">
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" /> Users</TabsTrigger>
            <TabsTrigger value="charities"><Building className="h-4 w-4 mr-1" /> Charities</TabsTrigger>
            <TabsTrigger value="draws"><Trophy className="h-4 w-4 mr-1" /> Draws</TabsTrigger>
            <TabsTrigger value="winners"><Trophy className="h-4 w-4 mr-1" /> Winners</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader><CardTitle>All users ({users.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium">Name</th>
                        <th className="pb-3 font-medium">Email</th>
                        <th className="pb-3 font-medium">Plan</th>
                        <th className="pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b last:border-0">
                          <td className="py-3">{u.full_name || '—'}</td>
                          <td className="py-3 text-muted-foreground">{u.email}</td>
                          <td className="py-3">{u.subscriptions?.[0]?.plan || '—'}</td>
                          <td className="py-3">
                            <Badge variant={u.subscriptions?.[0]?.status === 'active' ? 'default' : 'secondary'}>
                              {u.subscriptions?.[0]?.status || 'free'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charities">
            <Card>
              <CardHeader><CardTitle>Manage charities</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-3">
                  <Input placeholder="Charity name" value={newCharity.name} onChange={(e) => setNewCharity({ ...newCharity, name: e.target.value })} className="max-w-xs" />
                  <Input placeholder="Description" value={newCharity.description} onChange={(e) => setNewCharity({ ...newCharity, description: e.target.value })} className="max-w-sm" />
                  <Button onClick={addCharity}><Plus className="h-4 w-4 mr-1" /> Add</Button>
                </div>
                <div className="space-y-2">
                  {charities.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                      <div>
                        <span className="font-medium">{c.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">{c.description}</span>
                      </div>
                      <Button variant={c.active ? 'outline' : 'default'} size="sm" onClick={() => toggleCharity(c.id, c.active)}>
                        {c.active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="draws">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Monthly draws</CardTitle>
                <Button onClick={runDraw} disabled={drawRunning} variant="gold">
                  <Play className="h-4 w-4 mr-1" />
                  {drawRunning ? 'Running...' : 'Run draw'}
                </Button>
              </CardHeader>
              <CardContent>
                {draws.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No draws yet. Run your first draw above.</p>
                ) : (
                  <div className="space-y-3">
                    {draws.map((d) => (
                      <div key={d.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                        <span>{new Date(d.draw_date).toLocaleDateString()}</span>
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
          </TabsContent>

          <TabsContent value="winners">
            <Card>
              <CardHeader><CardTitle>Winner verification</CardTitle></CardHeader>
              <CardContent>
                {winners.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No winners yet.</p>
                ) : (
                  <div className="space-y-3">
                    {winners.map((w) => (
                      <div key={w.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                        <div>
                          <span className="font-medium">{w.profiles?.full_name || w.profiles?.email || 'Unknown'}</span>
                          <span className="text-sm text-muted-foreground ml-2">{w.matches_count} matches — £{w.prize_amount?.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            w.verification_status === 'approved' ? 'default' :
                            w.verification_status === 'rejected' ? 'destructive' : 'secondary'
                          }>
                            {w.verification_status}
                          </Badge>
                          {w.verification_status === 'pending' && (
                            <>
                              <Button size="sm" variant="default" onClick={() => updateVerification(w.id, 'approved')}>
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => updateVerification(w.id, 'rejected')}>
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
