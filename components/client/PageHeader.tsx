import Link from "next/link";
export default function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: { href: string; label: string } }) {
  return <header className="premium-page-header"><div><p>{eyebrow}</p><h1>{title}</h1>{description && <span>{description}</span>}</div>{action && <Link href={action.href} className="premium-secondary-button">{action.label}</Link>}</header>;
}
