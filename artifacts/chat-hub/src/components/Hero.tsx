import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'wouter';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Heart, ArrowRight, Sparkles, ArrowLeft } from 'lucide-react';
import { useMemo, useRef } from 'react';

const PARTICLE_COUNT = 14;

export function Hero() {
  const { t, isRtl } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);

  // Precompute stable particle geometry once so re-renders (language switch,
  // auth state, etc.) don't jump/restart the animation or force re-layout.
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, () => ({
        size: Math.random() * 3 + 1,
        left: Math.random() * 100,
        top: Math.random() * 100,
        rise: 150 + Math.random() * 100,
        drift: (Math.random() - 0.5) * 80,
        peakOpacity: Math.random() * 0.5 + 0.2,
        duration: Math.random() * 8 + 7,
        delay: Math.random() * 5,
      })),
    []
  );
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Parallax effects
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  // Keep the text/CTA drift subtle so it never gets dragged down far enough to be
  // clipped by the section's own bottom edge (which used to make it look like the
  // next block was slamming shut on top of the buttons).
  const yText = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);
  // Fade starts late and finishes right as the section scrolls away, so the CTA
  // buttons (posts + donate) stay fully visible and clickable for most of the
  // scroll and simply dissolve in place instead of sliding off and getting cut.
  const opacityText = useTransform(scrollYProgress, [0.8, 1], [1, 0]);

  const pills = [
    t('pill.meaning'),
    t('pill.happiness'),
    t('pill.peace'),
    t('pill.purpose'),
    t('pill.hope'),
    t('pill.mercy'),
  ];

  return (
    <section 
      ref={containerRef}
      className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-background"
    >
      {/* Background Imagery & Parallax */}
      <motion.div 
        className="absolute inset-0 z-0"
        style={{ y: yBg }}
      >
        {/* Main Desert Background */}
        <div 
          className="absolute inset-0 bg-cover bg-[center_top] md:bg-center bg-no-repeat"
          style={{ backgroundImage: `url('/hero_desert.jpg')` }}
        />
        
        {/* Geometric Accent Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-[center_top] md:bg-center bg-no-repeat opacity-40 mix-blend-color-dodge"
          style={{ 
            backgroundImage: `url('/hero_geometric.jpg')`,
            maskImage: 'linear-gradient(to bottom, black 20%, transparent 80%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 20%, transparent 80%)'
          }}
        />
        
        {/* Gradients for Text Readability */}
        {/* Bottom fade into the rest of the page */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        
        {/* Side fade based on text alignment (RTL/LTR) */}
        <div 
          className={`absolute inset-0 bg-gradient-to-r ${
            isRtl 
              ? 'from-transparent via-background/50 to-background' 
              : 'from-background via-background/50 to-transparent'
          } opacity-100`} 
        />
        
        {/* A subtle radial glow behind the text area */}
        <div 
          className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-0 translate-x-1/4' : 'left-0 -translate-x-1/4'} w-[800px] h-[800px] bg-primary/10 blur-[120px] rounded-full pointer-events-none`}
        />
      </motion.div>

      {/* Atmospheric Particles */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden hidden sm:block">
        {particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-primary/70"
            style={{
              width: p.size + 'px',
              height: p.size + 'px',
              left: `${p.left}%`,
              top: `${p.top}%`,
              willChange: 'transform, opacity',
            }}
            animate={{
              y: [0, -p.rise],
              x: [0, p.drift],
              opacity: [0, p.peakOpacity, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: "linear",
              delay: p.delay,
            }}
          />
        ))}
      </div>

      {/* Hero Content */}
      <div className="container relative z-10 px-5 sm:px-6 lg:px-8 mx-auto w-full h-full flex flex-col justify-center pt-32 pb-24 md:pt-28 md:pb-20">
        <motion.div 
          style={{ y: yText, opacity: opacityText }}
          className={`max-w-4xl flex flex-col ${isRtl ? 'items-center md:items-end text-center md:text-right md:ml-auto' : 'items-center md:items-start text-center md:text-left md:mr-auto'}`}
        >
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, x: isRtl ? 30 : -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 border border-primary/25 text-primary shadow-[0_0_15px_rgba(var(--primary),0.3)] shrink-0">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <span className="text-[10px] sm:text-xs md:text-base font-bold tracking-[0.2em] md:tracking-[0.25em] uppercase text-primary drop-shadow-sm">
              {t('hero.eyebrow')}
            </span>
            <div className={`w-8 md:w-16 h-px bg-gradient-to-r ${isRtl ? 'from-transparent to-primary/50' : 'from-primary/50 to-transparent'} hidden md:block`} />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-5xl md:text-7xl lg:text-[6.5rem] font-bold font-serif leading-[1.1] md:leading-[1.05] tracking-tight md:tracking-tight mb-6 md:mb-8 drop-shadow-2xl text-transparent bg-clip-text bg-gradient-to-b from-foreground via-foreground to-foreground/60 text-balance"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {t('hero.headline')}
          </motion.h1>

          {/* Quote / Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-xl sm:text-2xl md:text-4xl text-primary font-serif italic font-light leading-snug drop-shadow-lg mb-5 md:mb-6 max-w-3xl text-balance"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            &ldquo;{t('hero.question')}&rdquo;
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-base sm:text-lg md:text-xl lg:text-2xl text-foreground/80 font-medium leading-relaxed max-w-2xl mb-8 md:mb-12 text-balance"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {t('hero.invite')}
          </motion.p>

          {/* Pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-3 mb-10 md:mb-14"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {pills.map((pill, idx) => (
              <motion.span
                key={idx}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.8 + idx * 0.08, ease: "easeOut", duration: 0.5 }}
                className="px-5 py-2.5 rounded-full border border-primary/25 bg-background/50 backdrop-blur-md text-sm font-medium text-foreground/90 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.5)] hover:border-primary/60 hover:bg-primary/10 hover:text-primary transition-all duration-300 cursor-default"
              >
                {pill}
              </motion.span>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto"
          >
            <Link 
              href="/posts" 
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-primary text-primary-foreground font-bold text-sm uppercase tracking-widest overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] glow-gold shadow-[0_0_40px_-10px_hsl(var(--primary))]"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative z-10">{t('nav.posts')}</span>
              {isRtl ? (
                <ArrowLeft className="w-5 h-5 relative z-10 group-hover:-translate-x-1 transition-transform" />
              ) : (
                <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              )}
            </Link>

            <a
              href="https://new.donatepay.ru/@PeacefulCall"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full border border-border/60 bg-secondary/80 backdrop-blur-md text-foreground/90 font-bold text-sm uppercase tracking-widest hover:bg-secondary hover:text-primary transition-all duration-300 shadow-lg hover:border-primary/40"
            >
              <Heart className="w-5 h-5 text-primary/60 group-hover:text-primary transition-colors" />
              {t('nav.donate')}
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
