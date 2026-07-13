// Types validados contra a Table A da Places API (New) — types fora da tabela
// fazem o request falhar com 400. Não adicionar sem confirmar na documentação:
// https://developers.google.com/maps/documentation/places/web-service/place-types

export interface NicheSubtype {
  type: string
  label: string
}

export interface Niche {
  id: string
  label: string
  subtypes: NicheSubtype[]
}

export const NICHES: Niche[] = [
  {
    id: 'beauty',
    label: 'Beleza e Estética',
    subtypes: [
      { type: 'beauty_salon', label: 'Salão de beleza' },
      { type: 'hair_salon', label: 'Cabeleireiro' },
      { type: 'barber_shop', label: 'Barbearia' },
      { type: 'nail_salon', label: 'Unhas' },
      { type: 'beautician', label: 'Esteticista' },
      { type: 'makeup_artist', label: 'Maquilhagem' },
      { type: 'tanning_studio', label: 'Bronzeamento' },
    ],
  },
  {
    id: 'health',
    label: 'Saúde e Bem-estar',
    subtypes: [
      { type: 'dentist', label: 'Dentista' },
      { type: 'dental_clinic', label: 'Clínica dentária' },
      { type: 'physiotherapist', label: 'Fisioterapeuta' },
      { type: 'chiropractor', label: 'Quiroprático' },
      { type: 'massage', label: 'Massagens' },
      { type: 'spa', label: 'Spa' },
      { type: 'skin_care_clinic', label: 'Clínica de pele' },
      { type: 'wellness_center', label: 'Centro de bem-estar' },
      { type: 'yoga_studio', label: 'Estúdio de yoga' },
    ],
  },
  {
    id: 'technical',
    label: 'Serviços Técnicos',
    subtypes: [
      { type: 'electrician', label: 'Electricista' },
      { type: 'plumber', label: 'Canalizador' },
      { type: 'painter', label: 'Pintor' },
      { type: 'roofing_contractor', label: 'Telhados' },
      { type: 'locksmith', label: 'Serralheiro' },
      { type: 'moving_company', label: 'Mudanças' },
      { type: 'laundry', label: 'Lavandaria' },
      { type: 'tailor', label: 'Alfaiate / Costura' },
    ],
  },
  {
    id: 'auto',
    label: 'Automóvel',
    subtypes: [
      { type: 'car_repair', label: 'Oficina' },
      { type: 'car_wash', label: 'Lavagem auto' },
      { type: 'tire_shop', label: 'Pneus' },
      { type: 'auto_parts_store', label: 'Peças auto' },
      { type: 'car_dealer', label: 'Stand automóvel' },
    ],
  },
  {
    id: 'food',
    label: 'Restauração',
    subtypes: [
      { type: 'restaurant', label: 'Restaurante' },
      { type: 'cafe', label: 'Café' },
      { type: 'coffee_shop', label: 'Coffee shop' },
      { type: 'bakery', label: 'Padaria / Pastelaria' },
      { type: 'bar', label: 'Bar' },
      { type: 'pizza_restaurant', label: 'Pizzaria' },
      { type: 'fast_food_restaurant', label: 'Fast food' },
      { type: 'ice_cream_shop', label: 'Gelataria' },
      { type: 'meal_takeaway', label: 'Take-away' },
      { type: 'wine_bar', label: 'Wine bar' },
    ],
  },
  {
    id: 'retail',
    label: 'Comércio Local',
    subtypes: [
      { type: 'clothing_store', label: 'Roupa' },
      { type: 'shoe_store', label: 'Sapataria' },
      { type: 'jewelry_store', label: 'Joalharia' },
      { type: 'gift_shop', label: 'Presentes' },
      { type: 'florist', label: 'Florista' },
      { type: 'furniture_store', label: 'Mobiliário' },
      { type: 'book_store', label: 'Livraria' },
      { type: 'toy_store', label: 'Brinquedos' },
      { type: 'butcher_shop', label: 'Talho' },
      { type: 'cosmetics_store', label: 'Cosmética' },
    ],
  },
  {
    id: 'fitness',
    label: 'Fitness e Desporto',
    subtypes: [
      { type: 'gym', label: 'Ginásio' },
      { type: 'fitness_center', label: 'Centro de fitness' },
      { type: 'sports_club', label: 'Clube desportivo' },
      { type: 'sports_coaching', label: 'Treino / Coaching' },
      { type: 'sports_school', label: 'Escola desportiva' },
      { type: 'swimming_pool', label: 'Piscina' },
    ],
  },
  {
    id: 'pets',
    label: 'Animais',
    subtypes: [
      { type: 'veterinary_care', label: 'Veterinário' },
      { type: 'pet_store', label: 'Loja de animais' },
      { type: 'pet_care', label: 'Cuidados / Grooming' },
      { type: 'pet_boarding_service', label: 'Hotel de animais' },
    ],
  },
  {
    id: 'professional',
    label: 'Serviços Profissionais',
    subtypes: [
      { type: 'real_estate_agency', label: 'Imobiliária' },
      { type: 'insurance_agency', label: 'Seguros' },
      { type: 'lawyer', label: 'Advogado' },
      { type: 'consultant', label: 'Consultor' },
      { type: 'travel_agency', label: 'Agência de viagens' },
      { type: 'child_care_agency', label: 'Cuidados infantis' },
    ],
  },
]

export function nicheTypes(niche: Niche): string[] {
  return niche.subtypes.map((s) => s.type)
}
