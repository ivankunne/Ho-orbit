import { GENRE_GROUPS } from '@data/genres';

// Grouped <optgroup> options for a native <select>. Subgenres are prefixed so the
// hierarchy reads clearly even without nesting (native <option> can't nest).
// The stored value is the genre label, matching how `genre` is persisted.
export default function GenreOptions() {
  return (
    <>
      {GENRE_GROUPS.map(group => (
        <optgroup key={group.label} label={group.label}>
          {group.genres.flatMap(node => [
            <option key={node.name} value={node.name}>{node.name}</option>,
            ...(node.sub ?? []).map(sub => (
              <option key={sub} value={sub}>{`  ${sub}`}</option>
            )),
          ])}
        </optgroup>
      ))}
    </>
  );
}
