export interface FunnelGoals {
  maxCPA: number;
  maxCPL: number;
  maxCheckoutCost: number;
  maxRegistrationCost: number;
  maxLPVCost: number;
}

export interface Client {
  id: string;
  name: string;
}

export interface Funnel {
  id: string;
  clientId: string;
  name: string;
  goals: FunnelGoals;
}

export interface AdSetData {
  id: string;
  funnelId: string;
  name: string;
  status: 'active' | 'paused';
  budget: number; // Daily budget
  spent: number;
  purchases: number;
  leads: number;
  cpm: number;
  frequencyWeekly: number;
}

export interface CreativeData {
  id: string;
  adSetId: string;
  funnelId: string;
  name: string;
  status: 'active' | 'paused';
  thumbnailUrl?: string; // New field for thumbnails
  spent: number;
  purchases: number;
  initiateCheckouts: number;
  leads: number;
  completeRegistrations: number;
  landingPageViews: number;
  linkClicks: number;
  impressions: number;
  
  // Secondary metrics for analysis
  hookRate: number; // 3s retention
  frequencyWeekly: number;
}

export const mockClients: Client[] = [
  { id: 'cli_1', name: 'Dr. Silva (Médico High Ticket)' },
  { id: 'cli_2', name: 'Advogados Associados' }
];

export const mockFunnels: Funnel[] = [
  {
    id: 'f_1',
    clientId: 'cli_1',
    name: 'Mentoria Premium (Venda Direta)',
    goals: {
      maxCPA: 1500, // High ticket
      maxCPL: 50,
      maxCheckoutCost: 150,
      maxRegistrationCost: 80,
      maxLPVCost: 5
    }
  },
  {
    id: 'f_2',
    clientId: 'cli_1',
    name: 'Captação de Lançamento',
    goals: {
      maxCPA: 0,
      maxCPL: 15,
      maxCheckoutCost: 0,
      maxRegistrationCost: 20,
      maxLPVCost: 2
    }
  },
  {
    id: 'f_3',
    clientId: 'cli_2',
    name: 'Assessoria Jurídica B2B',
    goals: {
      maxCPA: 500,
      maxCPL: 80,
      maxCheckoutCost: 200,
      maxRegistrationCost: 100,
      maxLPVCost: 10
    }
  }
];

export const mockAdSets: AdSetData[] = [
  {
    id: 'as_1',
    funnelId: 'f_1',
    name: '01 - Lookalike Compradores 1%',
    status: 'active',
    budget: 300,
    spent: 1200,
    purchases: 3, // CPA = 400 (Goal 1500) -> EXCELLENT
    leads: 30,
    cpm: 25,
    frequencyWeekly: 1.2
  },
  {
    id: 'as_2',
    funnelId: 'f_1',
    name: '02 - Interesses: Medicina',
    status: 'active',
    budget: 150,
    spent: 2000,
    purchases: 0, // Spent > 1500, no sales -> BAD
    leads: 10,
    cpm: 40,
    frequencyWeekly: 3.5 // Fatigued
  },
  {
    id: 'as_3',
    funnelId: 'f_2',
    name: '01 - Remarketing 30d Engajamento',
    status: 'active',
    budget: 100,
    spent: 300,
    leads: 50, // CPL = 6 (Goal 15) -> EXCELLENT
    purchases: 0,
    cpm: 15,
    frequencyWeekly: 1.5
  },
  {
    id: 'as_4',
    funnelId: 'f_3',
    name: '01 - Cargos C-Level LinkedIn',
    status: 'active',
    budget: 200,
    spent: 800,
    purchases: 0,
    leads: 5, // CPL = 160 (Goal 80) -> BAD
    cpm: 55,
    frequencyWeekly: 2.0
  }
];

export const mockCreatives: CreativeData[] = [
  // AdSet 1 (f_1)
  {
    id: 'cr_1',
    adSetId: 'as_1',
    funnelId: 'f_1',
    name: 'VÍDEO 01 - Dor Principal Médicos',
    status: 'active',
    thumbnailUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=200&q=80',
    spent: 800,
    purchases: 1, 
    initiateCheckouts: 6,
    leads: 20, 
    completeRegistrations: 15,
    landingPageViews: 200,
    linkClicks: 250,
    impressions: 15000,
    hookRate: 35,
    frequencyWeekly: 1.5
  },
  {
    id: 'cr_2',
    adSetId: 'as_1',
    funnelId: 'f_1',
    name: 'IMAGEM 02 - Carrossel Benefícios',
    status: 'active',
    thumbnailUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=200&q=80',
    spent: 400,
    purchases: 2,
    initiateCheckouts: 5, 
    leads: 10,
    completeRegistrations: 8,
    landingPageViews: 100,
    linkClicks: 120,
    impressions: 10000,
    hookRate: 0,
    frequencyWeekly: 1.1
  },
  // AdSet 2 (f_1)
  {
    id: 'cr_3',
    adSetId: 'as_2',
    funnelId: 'f_1',
    name: 'VÍDEO 03 - Convite Genérico',
    status: 'active',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=200&q=80',
    spent: 2000, // spent 2000 no sales
    purchases: 0,
    initiateCheckouts: 0,
    leads: 10, // CPL = 200
    completeRegistrations: 5,
    landingPageViews: 150,
    linkClicks: 300,
    impressions: 25000,
    hookRate: 15, // Bad hook
    frequencyWeekly: 4.5
  },
  // AdSet 3 (f_2)
  {
    id: 'cr_4',
    adSetId: 'as_3',
    funnelId: 'f_2',
    name: 'VÍDEO 04 - Urgência',
    status: 'active',
    thumbnailUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=200&q=80',
    spent: 100,
    purchases: 0,
    initiateCheckouts: 0,
    leads: 10, 
    completeRegistrations: 8,
    landingPageViews: 45,
    linkClicks: 50,
    impressions: 5000,
    hookRate: 40,
    frequencyWeekly: 1.2
  },
  // AdSet 4 (f_3)
  {
    id: 'cr_5',
    adSetId: 'as_4',
    funnelId: 'f_3',
    name: 'VÍDEO 05 - Estudo de Caso Empresas',
    status: 'active',
    thumbnailUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32d7?auto=format&fit=crop&w=200&q=80',
    spent: 600,
    purchases: 0, 
    initiateCheckouts: 2, 
    leads: 5, // CPL = 120 (Goal: 80) -> FAILING CPL
    completeRegistrations: 3,
    landingPageViews: 50,
    linkClicks: 80,
    impressions: 8000,
    hookRate: 32,
    frequencyWeekly: 2.0
  }
];
