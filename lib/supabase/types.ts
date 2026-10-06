/**
 * Future player record. Not read or written by the local prototype.
 * A later auth pass can map this onto a Supabase `profiles` table.
 */
export type PlayerProfile = {
  id: string;
  display_name: string;
  cash: number;
  heists_completed: number;
  updated_at: string;
};
