export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface Room {
  id: number;
  name: string;
  code: string;
  host_id: number;
  status: 'waiting' | 'swiping' | 'done';
  created_at: string;
}

export interface Member {
  id: number;
  username: string;
  joined_at: string;
}

export interface Movie {
  id: number;
  title: string;
  year: number;
  genre: string;
  description: string;
  poster: string;
}
