'use client';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import Image from 'next/image';
import type { Movie } from '@/types';

interface Props {
  movie: Movie;
  onSwipe: (direction: 'like' | 'dislike') => void;
  isTop: boolean;
}

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

export default function MovieCard({ movie, onSwipe, isTop }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-150, 150], [-20, 20]);
  const likeOpacity = useTransform(x, [20, 80], [0, 1]);
  const dislikeOpacity = useTransform(x, [-80, -20], [1, 0]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > 100) onSwipe('like');
    else if (info.offset.x < -100) onSwipe('dislike');
  }

  return (
    <motion.div
      style={{ x, rotate }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
      whileTap={{ scale: 1.02 }}
    >
      <div className="relative w-full h-full rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-2xl">
        <Image
          src={`${POSTER_BASE}${movie.poster}`}
          alt={movie.title}
          fill
          className="object-cover"
          priority={isTop}
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {isTop && (
          <>
            <motion.div
              style={{ opacity: likeOpacity }}
              className="absolute top-8 left-6 border-4 border-green-400 text-green-400 font-black text-3xl px-3 py-1 rounded-lg rotate-[-15deg]"
            >
              LIKE
            </motion.div>
            <motion.div
              style={{ opacity: dislikeOpacity }}
              className="absolute top-8 right-6 border-4 border-red-400 text-red-400 font-black text-3xl px-3 py-1 rounded-lg rotate-[15deg]"
            >
              NOPE
            </motion.div>
          </>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h2 className="text-xl font-bold">{movie.title}</h2>
          <p className="text-sm text-neutral-400">{movie.year} · {movie.genre}</p>
          <p className="text-sm text-neutral-300 mt-2 line-clamp-2">{movie.description}</p>
        </div>
      </div>
    </motion.div>
  );
}
