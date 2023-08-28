import cn from "@/lib/utils/cn";

export function ActionItem({
  label,
  selected,
  className,
  ...buttonProps
}: {
  selected: boolean;
  label: React.ReactNode;
} & React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>) {
  return (
    <li>
      <button
        {...buttonProps}
        className={cn(
          'py-0.5 px-1.5 rounded bg-transparent border-none hover:bg-blue-200 transition-colors hover:text-black/90 cursor-pointer',
          {
            'bg-blue-300': selected,
            'bg-gray-400 text-black/50': buttonProps.disabled,
          },
          className,
        )}
      >
        {label}
      </button>
    </li>
  );
}
