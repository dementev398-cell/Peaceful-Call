export const GRADE_META: Record<string, { label: Record<string, string>; className: string }> = {
  sahih: {
    label: { RU: 'Достоверный (сахих)', EN: 'Authentic (Sahih)', AR: 'صحيح' },
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  },
  hasan: {
    label: { RU: 'Хороший (хасан)', EN: 'Good (Hasan)', AR: 'حسن' },
    className: 'bg-sky-500/10 text-sky-400 border-sky-500/25',
  },
  daif: {
    label: { RU: 'Слабый (даиф)', EN: 'Weak (Da\u2019if)', AR: 'ضعيف' },
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  },
  mawdu: {
    label: { RU: 'Вымышленный (мавду)', EN: 'Fabricated (Mawdu\u2019)', AR: 'موضوع' },
    className: 'bg-red-500/10 text-red-400 border-red-500/25',
  },
};
