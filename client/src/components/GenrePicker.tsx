'use client';

interface Props {
  selected: number[];
  onChange: (ids: number[]) => void;
}

const GENRES = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 18, name: 'Drama' },
  { id: 14, name: 'Fantasy' },
  { id: 27, name: 'Horror' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' },
];

export default function GenrePicker({ selected, onChange }: Props) {
  function toggle(id: number) {
    if (selected.includes(id)) {
      onChange(selected.filter((g) => g !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {GENRES.map((g) => {
        const active = selected.includes(g.id);
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => toggle(g.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              active
                ? 'bg-brand text-surface'
                : 'bg-surface-dark border border-surface-light text-muted hover:text-white'
            }`}
          >
            {g.name}
          </button>
        );
      })}
    </div>
  );
}
