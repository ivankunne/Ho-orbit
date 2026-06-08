import { SelectGroup, SelectLabel, SelectItem } from '@components/ui/select';
import { GENRE_GROUPS } from '@data/genres';

// Grouped genre options for a shadcn <Select>. Parent genres render normally;
// subgenres render indented beneath their parent. The stored value is the genre
// label itself, matching how `genre` is persisted across the app.
export default function GenreSelectItems() {
  return (
    <>
      {GENRE_GROUPS.map(group => (
        <SelectGroup key={group.label}>
          <SelectLabel>{group.label}</SelectLabel>
          {group.genres.map(node => (
            <div key={node.name}>
              <SelectItem value={node.name}>{node.name}</SelectItem>
              {node.sub?.map(sub => (
                <SelectItem key={sub} value={sub} className="pl-8 text-slate-400">
                  {sub}
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectGroup>
      ))}
    </>
  );
}
