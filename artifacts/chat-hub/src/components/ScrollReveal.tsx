import { motion } from 'framer-motion';
import { ReactNode } from 'react';

export function ScrollReveal({ 
  children, 
  className = '', 
  delay = '0' 
}: { 
  children: ReactNode; 
  className?: string; 
  delay?: string; 
}) {
  const delayNum = parseInt(delay) / 1000;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, filter: 'blur(4px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.8, delay: delayNum, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
