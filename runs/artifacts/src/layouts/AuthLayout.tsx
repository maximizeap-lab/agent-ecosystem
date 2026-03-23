import { Outlet } from "react-router-dom";
import { APP_NAME } from "@constants/index";

/**
 * AuthLayout — Centred card layout used by Login, Register, and
 * password-reset pages.
 */
export function AuthLayout() {
  return (
    <div className="auth-layout">
      {/* Background decoration */}
      <div className="auth-layout__bg" aria-hidden="true">
        <div className="auth-layout__bg-circle auth-layout__bg-circle--1" />
        <div className="auth-layout__bg-circle auth-layout__bg-circle--2" />
      </div>

      <div className="auth-layout__container">
        {/* Brand / logo */}
        <div className="auth-layout__brand">
          <span className="auth-layout__logo" aria-label={APP_NAME}>
            ⬡
          </span>
          <span className="auth-layout__app-name">{APP_NAME}</span>
        </div>

        {/* Page content (Login, Register, …) */}
        <div className="auth-layout__card">
          <Outlet />
        </div>

        {/* Footer */}
        <p className="auth-layout__footer">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
