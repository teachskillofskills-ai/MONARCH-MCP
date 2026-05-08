"use client";

import { useState } from "react";
import { Btn } from "./ui";
import { G } from "./icons";

export default function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Btn variant="secondary" size="sm" icon={<G name={copied ? "check" : "copy"} size={14}/>}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}>
      {copied ? "Copied" : "Copy"}
    </Btn>
  );
}
