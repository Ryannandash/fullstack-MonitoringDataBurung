const DIET_LABELS = {
  Carnivorous: 'Pemakan daging (Carnivorous)',
  Frugivorous: 'Pemakan buah (Frugivorous)',
  Piscivorous: 'Pemakan ikan (Piscivorous)',
  Palynivorous: 'Pemakan serbuk sari (Palynivorous)',
  Molluscivorous: 'Pemakan moluska (Molluscivorous)',
  Herbivorous: 'Pemakan tumbuhan (Herbivorous)',
  Omnivorous: 'Pemakan segala (Omnivorous)',
  Avivorous: 'Pemakan burung (Avivorous)',
  Nectivorous: 'Pemakan nektar (Nectivorous)',
  Mucivorous: 'Pemakan lendir dan getah (Mucivorous)',
  Ophiophagous: 'Pemakan ular (Ophiophagous)',
  Insectivorous: 'Pemakan serangga (Insectivorous)',
  Granivorous: 'Pemakan biji-bijian (Granivorous)'
}

export const formatDietType = (dietType) => (dietType || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
  .map((item) => DIET_LABELS[item] || item)
  .join(', ')
