import StubPage from "@/components/StubPage";

export default function StudioPage() {
  return (
    <StubPage title="Build your own MCP" subtitle="Define a template + tools right from the UI" icon="zap">
      Today, new templates are added by dropping a TypeScript file under <code>src/lib/templates/</code>. The Studio will let you define them in the browser: name, secret schema, tools (with their HTTP request shapes), and publish to the local catalog.
    </StubPage>
  );
}
