import { PageTransition } from '@/components/PageTransition';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Link } from 'wouter';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <PageTransition className="min-h-screen w-full flex flex-col bg-background gradient-bg">
      <Navbar />
      <main className="flex-grow flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-6 opacity-80" />
          <h1 className="text-4xl font-serif font-bold text-foreground mb-4">404</h1>
          <p className="text-xl text-muted-foreground mb-8 font-serif">
            Похоже, такой страницы не существует.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm uppercase tracking-widest hover:brightness-110 transition-all glow-gold-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('auth.backHome')}
          </Link>
        </div>
      </main>
      <Footer />
    </PageTransition>
  );
}
