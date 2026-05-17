import { ArrowLeftOutlined } from "@ant-design/icons";

const BackButton = ({
  onClick,
  label = "Back",
  title,
  disabled = false,
  className = "",
}) => {
  const resolvedTitle = title || label;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={resolvedTitle}
      title={resolvedTitle}
      className={`group inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--app-bg-muted)] text-[var(--app-text-secondary)] shadow-sm transition-all hover:bg-primary-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim()}
    >
      <ArrowLeftOutlined className="transition-transform group-hover:-translate-x-1" />
    </button>
  );
};

export default BackButton;
