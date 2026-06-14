export default function TemplatePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Template Plugin</h1>
      <p className="text-muted-foreground">
        This is a template plugin. Copy this directory, replace the content, and register in{' '}
        <code>packages/plugin-registry/src/index.ts</code>.
      </p>
    </div>
  );
}
