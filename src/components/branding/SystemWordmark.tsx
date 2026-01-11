type WordmarkColor = "blue" | "red" | "orange" | "green" | "pink" | "violet";

export type WordmarkSegment = { text: string; color: WordmarkColor };

type Props = {
  segments: WordmarkSegment[];
  className?: string;
};

function colorClass(color: WordmarkColor): string {
  switch (color) {
    case "blue":
      return "text-blue-700";
    case "red":
      return "text-red-500";
    case "orange":
      return "text-orange-500";
    case "green":
      return "text-emerald-500";
    case "pink":
      return "text-pink-500";
    case "violet":
      return "text-violet-500";
    default:
      return "text-slate-800";
  }
}

export function SystemWordmark({ segments, className }: Props) {
  const wrapperClass = ["inline-flex items-baseline", className].filter(Boolean).join(" ");

  return (
    <span className={wrapperClass} aria-label="Conectarte">
      {segments.map((seg, idx) => (
        <span
          key={`${seg.text}-${idx}`}
          className={["font-semibold", colorClass(seg.color)].filter(Boolean).join(" ")}
        >
          {seg.text}
        </span>
      ))}
    </span>
  );
}
