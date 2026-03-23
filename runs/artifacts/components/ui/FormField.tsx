// ─────────────────────────────────────────────
//  Reusable Form Field primitives
// ─────────────────────────────────────────────
import React from "react";

// ── FieldWrapper ──────────────────────────────
interface FieldWrapperProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FieldWrapper({
  label,
  htmlFor,
  error,
  hint,
  required,
  className = "",
  children,
}: FieldWrapperProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

// ── Base input styles ─────────────────────────
const baseInput =
  "w-full rounded-lg border bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors";
const normalBorder =
  "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20";
const errorBorder =
  "border-red-400 focus:border-red-500 focus:ring-red-500/20";

// ── TextInput ─────────────────────────────────
interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export function TextInput({
  label,
  error,
  hint,
  id,
  required,
  wrapperClassName,
  className = "",
  ...props
}: TextInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <FieldWrapper
      label={label}
      htmlFor={inputId}
      error={error}
      hint={hint}
      required={required}
      className={wrapperClassName}
    >
      <input
        id={inputId}
        className={`${baseInput} ${error ? errorBorder : normalBorder} ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
    </FieldWrapper>
  );
}

// ── Textarea ──────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export function Textarea({
  label,
  error,
  hint,
  id,
  required,
  wrapperClassName,
  className = "",
  ...props
}: TextareaProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <FieldWrapper
      label={label}
      htmlFor={inputId}
      error={error}
      hint={hint}
      required={required}
      className={wrapperClassName}
    >
      <textarea
        id={inputId}
        rows={3}
        className={`${baseInput} ${error ? errorBorder : normalBorder} resize-y ${className}`}
        aria-invalid={!!error}
        {...props}
      />
    </FieldWrapper>
  );
}

// ── Select ────────────────────────────────────
interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export function Select({
  label,
  options,
  placeholder,
  error,
  hint,
  id,
  required,
  wrapperClassName,
  className = "",
  ...props
}: SelectProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <FieldWrapper
      label={label}
      htmlFor={inputId}
      error={error}
      hint={hint}
      required={required}
      className={wrapperClassName}
    >
      <select
        id={inputId}
        className={`${baseInput} ${error ? errorBorder : normalBorder} cursor-pointer ${className}`}
        aria-invalid={!!error}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}

// ── NumberInput ───────────────────────────────
interface NumberInputProps extends Omit<TextInputProps, "type"> {
  unit?: string;
}

export function NumberInput({ unit, className = "", ...props }: NumberInputProps) {
  if (!unit) return <TextInput type="number" {...props} className={className} />;
  const inputId = props.id ?? props.label.toLowerCase().replace(/\s+/g, "-");
  return (
    <FieldWrapper
      label={props.label}
      htmlFor={inputId}
      error={props.error}
      hint={props.hint}
      required={props.required}
      className={props.wrapperClassName}
    >
      <div className="relative">
        <input
          id={inputId}
          type="number"
          className={`${baseInput} ${props.error ? errorBorder : normalBorder} pr-12 ${className}`}
          aria-invalid={!!props.error}
          {...props}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 pointer-events-none">
          {unit}
        </span>
      </div>
    </FieldWrapper>
  );
}

// ── TagInput (comma-separated list) ──────────
interface TagInputProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
}

export function TagInput({ label, tags, onChange, placeholder, error, hint }: TagInputProps) {
  const [input, setInput] = React.useState("");

  function addTag(raw: string) {
    const newTags = raw
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t && !tags.includes(t));
    if (newTags.length) onChange([...tags, ...newTags]);
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <FieldWrapper label={label} error={error} hint={hint}>
      <div
        className={`flex flex-wrap gap-1.5 min-h-[42px] w-full rounded-lg border bg-white dark:bg-gray-800 px-3 py-2 focus-within:ring-2 ${
          error
            ? "border-red-400 focus-within:ring-red-500/20"
            : "border-gray-300 dark:border-gray-600 focus-within:border-blue-500 focus-within:ring-blue-500/20"
        }`}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-medium rounded px-2 py-0.5"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-red-500 transition-colors"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(input);
            } else if (e.key === "Backspace" && !input && tags.length) {
              removeTag(tags[tags.length - 1]);
            }
          }}
          onBlur={() => input.trim() && addTag(input)}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none"
        />
      </div>
    </FieldWrapper>
  );
}

// ── AvatarUpload ──────────────────────────────
interface AvatarUploadProps {
  currentUrl?: string;
  name: string;
  onChange: (dataUrl: string) => void;
  size?: "sm" | "md" | "lg";
}

export function AvatarUpload({ currentUrl, name, onChange, size = "md" }: AvatarUploadProps) {
  const sizeMap = { sm: "w-16 h-16", md: "w-24 h-24", lg: "w-32 h-32" };
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`${sizeMap[size]} rounded-full overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 transition-colors relative group focus:outline-none focus:ring-2 focus:ring-blue-500`}
        aria-label="Upload avatar"
      >
        {currentUrl ? (
          <img src={currentUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xl">
            {initials || "?"}
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <p className="text-xs text-gray-400">Click to upload photo</p>
    </div>
  );
}

// ── StatusBadge ───────────────────────────────
interface StatusBadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  active:    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  inactive:  "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  injured:   "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  retired:   "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  suspended: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
        STATUS_STYLES[status] ?? STATUS_STYLES.inactive
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
      {status}
    </span>
  );
}
