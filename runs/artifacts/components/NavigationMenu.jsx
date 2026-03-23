import React, { useState, useRef, useEffect, createContext, useContext } from "react";

/* ─────────────────────────────────────────
   Context
───────────────────────────────────────── */
const NavContext = createContext({});

/* ─────────────────────────────────────────
   Sidebar Navigation
───────────────────────────────────────── */
/**
 * SidebarNav — Collapsible left-side navigation.
 *
 * Props:
 *  items         : Array<NavItem>
 *  logo          : ReactNode
 *  collapsed     : boolean          — controlled collapse
 *  onCollapse    : (bool) => void
 *  activeKey     : string           — key of the active item
 *  onNavigate    : (item) => void
 *  footer        : ReactNode        — bottom slot (user profile, etc.)
 *  width         : number           — expanded width in px (default 240)
 *
 * NavItem shape:
 *  { key, label, icon?, badge?, children?, disabled?, divider? }
 */
export function SidebarNav({
  items = [],
  logo,
  collapsed: controlledCollapsed,
  onCollapse,
  activeKey,
  onNavigate,
  footer,
  width = 240,
}) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const isCollapsed = controlledCollapsed ?? internalCollapsed;

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setInternalCollapsed(next);
    onCollapse?.(next);
  };

  const toggleGroup = (key) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleNav = (item) => {
    if (item.disabled) return;
    onNavigate?.(item);
  };

  return (
    <NavContext.Provider value={{ activeKey, isCollapsed, openGroups, toggleGroup, handleNav }}>
      <aside
        className={`snav-sidebar ${isCollapsed ? "snav-collapsed" : ""}`}
        style={{ width: isCollapsed ? 64 : width }}
      >
        {/* Logo */}
        <div className="snav-logo-area">
          <div className="snav-logo">{logo}</div>
          <button
            className="snav-toggle-btn"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isCollapsed
                ? <path d="M9 18l6-6-6-6" />
                : <path d="M15 18l-6-6 6-6" />}
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <nav className="snav-menu" role="navigation" aria-label="Sidebar navigation">
          {items.map((item) =>
            item.divider ? (
              <div key={item.key} className="snav-divider" />
            ) : item.children ? (
              <SidebarGroup key={item.key} item={item} />
            ) : (
              <SidebarItem key={item.key} item={item} />
            )
          )}
        </nav>

        {/* Footer */}
        {footer && <div className="snav-footer">{footer}</div>}
      </aside>
    </NavContext.Provider>
  );
}

function SidebarItem({ item, nested = false }) {
  const { activeKey, isCollapsed, handleNav } = useContext(NavContext);
  const isActive = activeKey === item.key;

  return (
    <button
      className={`snav-item ${isActive ? "snav-item-active" : ""} ${nested ? "snav-item-nested" : ""} ${item.disabled ? "snav-item-disabled" : ""}`}
      onClick={() => handleNav(item)}
      title={isCollapsed ? item.label : undefined}
      disabled={item.disabled}
      aria-current={isActive ? "page" : undefined}
    >
      {item.icon && <span className="snav-item-icon">{item.icon}</span>}
      {!isCollapsed && <span className="snav-item-label">{item.label}</span>}
      {!isCollapsed && item.badge != null && (
        <span className={`snav-badge snav-badge-${item.badgeVariant || "primary"}`}>
          {item.badge}
        </span>
      )}
      {isCollapsed && item.badge != null && (
        <span className="snav-badge-dot" />
      )}
    </button>
  );
}

function SidebarGroup({ item }) {
  const { isCollapsed, openGroups, toggleGroup, activeKey } = useContext(NavContext);
  const isOpen = openGroups[item.key];
  const hasActiveChild = item.children?.some((c) => c.key === activeKey);

  return (
    <div className={`snav-group ${hasActiveChild ? "snav-group-has-active" : ""}`}>
      <button
        className={`snav-item snav-group-trigger ${hasActiveChild && !isOpen ? "snav-item-active" : ""}`}
        onClick={() => !isCollapsed && toggleGroup(item.key)}
        title={isCollapsed ? item.label : undefined}
      >
        {item.icon && <span className="snav-item-icon">{item.icon}</span>}
        {!isCollapsed && (
          <>
            <span className="snav-item-label">{item.label}</span>
            <svg
              className={`snav-chevron ${isOpen ? "snav-chevron-open" : ""}`}
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </>
        )}
      </button>

      {!isCollapsed && isOpen && (
        <div className="snav-group-children">
          {item.children.map((child) => (
            <SidebarItem key={child.key} item={child} nested />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Top Navigation Bar
───────────────────────────────────────── */
/**
 * TopNav — Horizontal top navigation bar.
 *
 * Props:
 *  logo        : ReactNode
 *  items       : Array<{ key, label, href? }>
 *  activeKey   : string
 *  onNavigate  : (item) => void
 *  actions     : ReactNode   — right-side slot (buttons, avatar, etc.)
 *  sticky      : boolean
 */
export function TopNav({ logo, items = [], activeKey, onNavigate, actions, sticky = true }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={`tnav-header ${sticky ? "tnav-sticky" : ""}`} role="banner">
      <div className="tnav-inner">
        {/* Logo */}
        <div className="tnav-logo">{logo}</div>

        {/* Desktop items */}
        <nav className="tnav-menu" role="navigation" aria-label="Top navigation">
          {items.map((item) => (
            <button
              key={item.key}
              className={`tnav-item ${activeKey === item.key ? "tnav-item-active" : ""}`}
              onClick={() => onNavigate?.(item)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="tnav-actions">{actions}</div>

        {/* Mobile hamburger */}
        <button
          className="tnav-hamburger"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="tnav-mobile-drawer">
          {items.map((item) => (
            <button
              key={item.key}
              className={`tnav-mobile-item ${activeKey === item.key ? "tnav-item-active" : ""}`}
              onClick={() => { onNavigate?.(item); setMenuOpen(false); }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

/* ─────────────────────────────────────────
   Breadcrumbs
───────────────────────────────────────── */
/**
 * Breadcrumbs
 *
 * Props:
 *  items    : Array<{ label, href?, onClick? }>
 *  separator: ReactNode  (default /)
 */
export function Breadcrumbs({ items = [], separator = "/" }) {
  return (
    <nav aria-label="Breadcrumb" className="bc-nav">
      <ol className="bc-list">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="bc-item">
              {isLast ? (
                <span className="bc-current" aria-current="page">{item.label}</span>
              ) : (
                <>
                  <button className="bc-link" onClick={item.onClick}>{item.label}</button>
                  <span className="bc-sep" aria-hidden="true">{separator}</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ─────────────────────────────────────────
   Dropdown Menu
───────────────────────────────────────── */
/**
 * DropdownMenu
 *
 * Props:
 *  trigger  : ReactNode
 *  items    : Array<{ label, icon?, onClick?, danger?, divider? }>
 *  align    : "left" | "right"
 */
export function DropdownMenu({ trigger, items = [], align = "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="dd-wrap" ref={ref}>
      <div onClick={() => setOpen((o) => !o)} className="dd-trigger">{trigger}</div>
      {open && (
        <ul className={`dd-menu dd-align-${align}`} role="menu">
          {items.map((item, i) =>
            item.divider ? (
              <li key={i} className="dd-divider" role="separator" />
            ) : (
              <li key={i} role="none">
                <button
                  className={`dd-item ${item.danger ? "dd-item-danger" : ""}`}
                  role="menuitem"
                  onClick={() => { item.onClick?.(); setOpen(false); }}
                >
                  {item.icon && <span className="dd-item-icon">{item.icon}</span>}
                  {item.label}
                </button>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Tabs
───────────────────────────────────────── */
/**
 * Tabs
 *
 * Props:
 *  tabs      : Array<{ key, label, icon?, badge? }>
 *  activeKey : string
 *  onChange  : (key) => void
 *  variant   : "underline" | "pill" | "boxed"
 */
export function Tabs({ tabs = [], activeKey, onChange, variant = "underline" }) {
  return (
    <div className={`tabs-wrap tabs-${variant}`} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={activeKey === tab.key}
          className={`tabs-tab ${activeKey === tab.key ? "tabs-tab-active" : ""}`}
          onClick={() => onChange?.(tab.key)}
        >
          {tab.icon && <span className="tabs-icon">{tab.icon}</span>}
          <span>{tab.label}</span>
          {tab.badge != null && <span className="tabs-badge">{tab.badge}</span>}
        </button>
      ))}
    </div>
  );
}
