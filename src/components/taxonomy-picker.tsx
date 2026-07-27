"use client";

import { Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Option = { id: string; name: string };
type CreateResult = { id: string; name: string } | { error: string };

export function TaxonomyPicker({
  name,
  placeholder,
  addLabel,
  options,
  createAction,
}: {
  name: string;
  placeholder: string;
  addLabel: string;
  options: Option[];
  createAction: (name: string) => Promise<CreateResult>;
}) {
  const [items, setItems] = useState(options);
  const [selected, setSelected] = useState(options[0]?.id ?? "");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const result = await createAction(newName.trim());
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setItems((prev) => [...prev, result]);
      setSelected(result.id);
      setAdding(false);
      setNewName("");
      setError(undefined);
    });
  }

  if (adding) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <Button type="button" size="sm" onClick={handleAdd} disabled={isPending}>
            حفظ
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setAdding(false);
              setError(undefined);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {error && <span className="text-xs font-medium text-danger">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <input type="hidden" name={name} value={selected} />
      <Select value={selected} onChange={(e) => setSelected(e.target.value)} className="flex-1">
        {items.length === 0 && <option value="">لا توجد عناصر بعد</option>}
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </Select>
      <Button type="button" size="sm" variant="secondary" onClick={() => setAdding(true)}>
        <Plus className="h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  );
}
