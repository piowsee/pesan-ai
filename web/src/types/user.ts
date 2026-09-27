export interface User {
  id: string;
  email: string;
  name: string;
  role?: string | null;
  image?: string | null;
}
