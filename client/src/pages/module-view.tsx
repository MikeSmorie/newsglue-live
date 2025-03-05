import { useParams } from "wouter";

interface ModuleViewProps {
  moduleId?: string;
}

export default function ModuleView({ moduleId }: ModuleViewProps) {
  const params = useParams();
  const id = moduleId || params.id;

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">Module {id}</h1>
      <div className="bg-muted rounded-lg p-6">
        <p className="text-muted-foreground">
          Module {id} View - Add function here later
        </p>
      </div>
    </div>
  );
}
