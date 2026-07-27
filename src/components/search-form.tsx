import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SearchForm({
  defaultValue,
  placeholder,
}: {
  defaultValue?: string;
  placeholder: string;
}) {
  return (
    <form method="GET" className="mb-5 flex max-w-md gap-2">
      <Input name="q" defaultValue={defaultValue} placeholder={placeholder} />
      <Button type="submit" variant="secondary" size="md">
        <Search className="h-4 w-4" />
        بحث
      </Button>
    </form>
  );
}
