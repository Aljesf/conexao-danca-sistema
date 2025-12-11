type Props = {
  children: React.ReactNode;
  className?: string;
};

function cn(...cls: (string | undefined | false)[]) {
  return cls.filter(Boolean).join(" ");
}

export default function Container({ children, className }: Props) {
  return (
    <div className={cn("mx-auto max-w-6xl px-4 md:px-8", className)}>
      {children}
    </div>
  );
}