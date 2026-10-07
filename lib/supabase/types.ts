/** Row shape for `public.profiles`. See supabase/schema.sql. */
export type PlayerProfile = {
  id: string;
  display_name: string | null;
  cash: number;
  energy: number;
  employed: boolean;
  businesses: string[];
  vehicles: string[];
  updated_at: string;
};
