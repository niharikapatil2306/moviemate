'use client';
import Image from 'next/image';
import type { Movie } from '@/types';

interface Props {
  movie: Movie;
  isTop: boolean;
}

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

export default function MovieCard({ movie, isTop }: Props) {
  return (
    <div className="absolute inset-0 select-none">
      <div className="relative w-full h-full rounded-2xl overflow-hidden bg-surface-dark border border-surface-light shadow-2xl">
        <Image
          src={`${POSTER_BASE}${movie.poster}`}
          alt={movie.title}
          fill
          className="object-cover"
          priority={isTop}
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-dark/95 via-surface-dark/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h2 className="text-xl font-bold text-white">{movie.title}</h2>
          <p className="text-sm text-muted">{movie.year} · {movie.genre}</p>
          <p className="text-sm text-white/80 mt-2 line-clamp-2">{movie.description}</p>
        </div>
      </div>
    </div>
  );
}
