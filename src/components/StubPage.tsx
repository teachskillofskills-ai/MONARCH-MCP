import { ReactNode } from "react";
import { Card } from "./ui";
import { G } from "./icons";

export default function StubPage({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: string; children?: ReactNode }) {
  return (
    <div style={{ padding: 24, display: "grid", gap: 16, maxWidth: 920 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>{title}</h1>
        <p style={{ color: "var(--fg-muted)", marginTop: 4 }}>{subtitle}</p>
      </div>
      <Card>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: "var(--brand-soft)",
            color: "var(--brand-ink)", display: "grid", placeItems: "center",
          }}>
            <G name={icon} size={20}/>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600 }}>Coming soon</p>
            <p style={{ fontSize: 13.5, color: "var(--fg-muted)", marginTop: 6, maxWidth: 560 }}>
              {children || "This screen is part of the v2 roadmap. The data model already supports it — only the UI is pending."}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
