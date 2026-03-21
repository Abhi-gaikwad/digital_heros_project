import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Heart, Trophy, Users, TrendingUp, ArrowRight, Star } from 'lucide-react';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import heroImage from '@/assets/hero-golf.jpg';

export default function LandingPage() {
  const ref = useScrollReveal();

  return (
    <div ref={ref} className="min-h-screen overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold">GolfGive</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-16">
        <div className="absolute inset-0 -z-10">
          <img src={heroImage} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/40" />
        </div>
        <div className="container flex min-h-[85vh] items-center py-24">
          <div className="max-w-xl animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-4 py-1.5 text-sm font-medium text-gold mb-6">
              <Star className="h-3.5 w-3.5" />
              <span>£12,847 raised this month</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6" style={{ lineHeight: '1.08' }}>
              Your score could change someone's life
            </h1>
            <p className="text-lg text-primary-foreground/75 mb-8 max-w-md">
              Enter your golf scores, compete in monthly draws, and direct your winnings to charities you care about. Every round matters.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="gold" size="xl" asChild>
                <Link to="/auth">
                  Join the draw
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="hero-outline" size="xl" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <Link to="#how-it-works">How it works</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-primary text-primary-foreground py-8">
        <div className="container grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Active members', value: '2,341' },
            { label: 'Charities supported', value: '18' },
            { label: 'Total raised', value: '£148K' },
            { label: 'Monthly prizes', value: '£8.2K' },
          ].map((stat, i) => (
            <div key={stat.label} className="text-center animate-count-up" style={{ animationDelay: `${i * 100 + 300}ms` }}>
              <div className="text-2xl sm:text-3xl font-bold font-display tabular-nums">{stat.value}</div>
              <div className="text-sm text-primary-foreground/70 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 surface-warm">
        <div className="container">
          <div className="text-center mb-16 reveal">
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4" style={{ lineHeight: '1.1' }}>
              Three steps to making a difference
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              It's simple: play, enter, and give. Your golf game funds real change.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                icon: Trophy,
                title: 'Submit your scores',
                desc: 'Enter your last 5 golf scores (1–45). They're your lottery numbers for the monthly draw.',
              },
              {
                icon: TrendingUp,
                title: 'Win in the draw',
                desc: 'Each month, 5 numbers are drawn. Match 3, 4, or all 5 to win a share of the prize pool.',
              },
              {
                icon: Heart,
                title: 'Give to charity',
                desc: 'Direct at least 10% of your winnings to a charity of your choice. Most members give far more.',
              },
            ].map((step, i) => (
              <div
                key={step.title}
                className="reveal bg-card rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24">
        <div className="container">
          <div className="text-center mb-16 reveal">
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4" style={{ lineHeight: '1.1' }}>
              Simple, transparent pricing
            </h2>
            <p className="text-muted-foreground">Every penny above costs goes to prizes and charity.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {[
              { name: 'Monthly', price: '£9.99', period: '/month', desc: 'Cancel anytime. Full access to draws and features.', popular: false },
              { name: 'Yearly', price: '£89.99', period: '/year', desc: 'Save 25%. Best value for committed players.', popular: true },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`reveal rounded-2xl p-8 border-2 transition-shadow hover:shadow-lg ${
                  plan.popular ? 'border-primary bg-primary/[0.03] shadow-md' : 'border-border'
                }`}
              >
                {plan.popular && (
                  <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-3 py-1 mb-4">
                    Most popular
                  </span>
                )}
                <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-3 mb-4">
                  <span className="text-4xl font-bold font-display tabular-nums">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">{plan.desc}</p>
                <Button variant={plan.popular ? 'default' : 'outline'} className="w-full" size="lg" asChild>
                  <Link to="/auth">Subscribe now</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-primary reveal">
        <div className="container text-center text-primary-foreground">
          <Users className="h-10 w-10 mx-auto mb-6 opacity-80" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4" style={{ lineHeight: '1.1' }}>
            Ready to play for a purpose?
          </h2>
          <p className="text-primary-foreground/75 max-w-md mx-auto mb-8">
            Join 2,341 golfers who've turned their hobby into hope.
          </p>
          <Button variant="gold" size="xl" asChild>
            <Link to="/auth">
              Get started free
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            <span className="font-display font-semibold">GolfGive</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 GolfGive. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
