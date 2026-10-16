export type Service = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  priceLabel: string;
  sortOrder: number;
  active: boolean;
};

export type Professional = {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  photoUrl: string;
  demo: boolean;
  active: boolean;
  sortOrder: number;
  weekdays: number[];
};

export type WeekHour = {
  weekday: number;
  isOpen: boolean;
  openMin: number;
  closeMin: number;
};

export type Closure = {
  id: string;
  day: string;
  professionalId: string | null;
  note: string;
};

export type GalleryItem = {
  id: string;
  src: string;
  alt: string;
  caption: string;
  fit: "cover" | "contain";
  sortOrder: number;
  visible: boolean;
};

export type Profile = {
  phoneDisplay: string;
  phoneNote: string;
  whatsappDisplay: string;
  whatsappNote: string;
  city: string;
  addressLine: string;
  mapsQuery: string;
  instagram: string;
  hoursDisclaimer: string;
  slotMinutes: number;
};

export const BOOKING_STATUS = [
  ["confirmado", "Confirmado"],
  ["concluido", "Concluído"],
  ["faltou", "Não compareceu"],
  ["cancelado", "Cancelado"],
] as const;

export type BookingStatus = (typeof BOOKING_STATUS)[number][0];

export type Booking = {
  id: string;
  professionalId: string;
  serviceId: string;
  professionalName: string;
  serviceName: string;
  priceLabel: string;
  day: string;
  startMin: number;
  endMin: number;
  status: BookingStatus;
  customerName: string;
  customerWhatsapp: string;
  hasAccount: boolean;
  note: string;
  createdAt: string;
};

/** O que o próprio cliente enxerga dos agendamentos dele. */
export type MyBooking = Omit<Booking, "customerWhatsapp" | "hasAccount" | "note">;

export const APPLICATION_STATUS = [
  ["recebida", "Recebida"],
  ["em-analise", "Em análise"],
  ["em-contato", "Em contato"],
  ["encerrada", "Encerrada"],
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUS)[number][0];

export type Application = {
  id: string;
  createdAt: string;
  name: string;
  whatsapp: string;
  email: string;
  role: string;
  experience: string;
  about: string;
  portfolio: string;
  status: ApplicationStatus;
  note: string;
};

export type StaffMember = {
  userId: string;
  name: string;
  email: string;
  createdAt: string;
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  link: string;
  createdAt: string;
  read: boolean;
};

export type Me = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  isAdmin: boolean;
  unread: number;
  /** True quando ainda não existe nenhum administrador (primeiro acesso). */
  canClaimAdmin: boolean;
};

export type PublicShop = {
  services: Service[];
  professionals: Professional[];
  hours: WeekHour[];
  closures: Closure[];
  gallery: GalleryItem[];
  profile: Profile;
};

export type AdminShop = PublicShop & {
  bookings: Booking[];
  applications: Application[];
  staff: StaffMember[];
};

export type SlotOption = {
  startMin: number;
  professionalIds: string[];
};

export type NextSlot = {
  day: string;
  startMin: number;
  serviceId: string;
  serviceName: string;
} | null;

export const MEDIA_LIBRARY = [
  { src: "/media/fachada.jpg", label: "Fachada" },
  { src: "/media/equipe.jpg", label: "Equipe" },
  { src: "/media/cadeira.png", label: "Cadeira da marca" },
  { src: "/media/contratando.jpg", label: "Anúncio de vagas" },
  { src: "/media/logo.png", label: "Logotipo" },
] as const;

export const SLOT_STEPS = [15, 20, 30, 40, 60] as const;
