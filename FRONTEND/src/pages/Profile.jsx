import React, { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";

const profileFields = {
  name: "",
  role: "Consumer",
  organization: "",
  product: "",
  location: "",
};

function ProfileIcon({
  type,
  size = 18,
}) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  switch (type) {
    case "user":
      return (
        <svg {...props}>
          <circle
            cx="12"
            cy="8"
            r="3.5"
          />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );

    case "building":
      return (
        <svg {...props}>
          <path d="M5 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17" />
          <path d="M3 21h18" />
          <path d="M9 7h3M9 11h3M9 15h3M16 9h2M16 13h2M16 17h2" />
        </svg>
      );

    case "location":
      return (
        <svg {...props}>
          <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
          <circle
            cx="12"
            cy="10"
            r="2.5"
          />
        </svg>
      );

    case "briefcase":
      return (
        <svg {...props}>
          <rect
            x="4"
            y="7"
            width="16"
            height="12"
            rx="2"
          />
          <path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" />
          <path d="M4 11h16" />
          <path d="M10 11v2h4v-2" />
        </svg>
      );

    case "shield":
      return (
        <svg {...props}>
          <path d="M12 3 19 6v5c0 4.7-2.8 8-7 10-4.2-2-7-5.3-7-10V6l7-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...props}>
          <path d="M5 12h13" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

    case "logout":
      return (
        <svg {...props}>
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
          <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
        </svg>
      );

    case "save":
      return (
        <svg {...props}>
          <path d="M5 4h14v17l-7-4-7 4V4Z" />
        </svg>
      );

    case "check":
      return (
        <svg {...props}>
          <circle
            cx="12"
            cy="12"
            r="9"
          />
          <path d="m8.5 12 2.2 2.2 4.8-5" />
        </svg>
      );

    default:
      return null;
  }
}

function getInitials(name) {
  const clean = String(
    name || "BISense User"
  ).trim();

  const parts = clean.split(/\s+/);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0].charAt(0)}${parts[
    parts.length - 1
  ].charAt(0)}`.toUpperCase();
}

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [form, setForm] =
    useState(profileFields);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [signingOut, setSigningOut] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const {
          data: {
            user: currentUser,
          },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!currentUser) {
          navigate("/login", {
            replace: true,
          });
          return;
        }

        if (!mounted) {
          return;
        }

        const metadata =
          currentUser.user_metadata ||
          {};

        setUser(currentUser);

        setForm({
          name:
            String(
              metadata.name || ""
            ).trim(),
          role:
            metadata.role ===
            "Manufacturer"
              ? "Manufacturer"
              : "Consumer",
          organization:
            String(
              metadata.organization || ""
            ).trim(),
          product:
            String(
              metadata.product || ""
            ).trim(),
          location:
            String(
              metadata.location || ""
            ).trim(),
        });
      } catch (loadError) {
        console.error(
          "Unable to load profile:",
          loadError
        );

        if (mounted) {
          setError(
            "Unable to load your profile. Please try again."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const initials = useMemo(
    () => getInitials(form.name),
    [form.name]
  );

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (error) {
      setError("");
    }

    if (success) {
      setSuccess("");
    }
  };

  const handleModeChange = (role) => {
    setForm((current) => ({
      ...current,
      role,
    }));

    setError("");
    setSuccess("");
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");
    setSuccess("");

    const cleanName =
      form.name.trim();

    if (!cleanName) {
      setError(
        "Please enter your name."
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data,
        error: updateError,
      } = await supabase.auth.updateUser({
        data: {
          name: cleanName,
          role:
            form.role ===
            "Manufacturer"
              ? "Manufacturer"
              : "Consumer",
          organization:
            form.organization.trim(),
          product:
            form.product.trim(),
          location:
            form.location.trim(),
        },
      });

      if (updateError) {
        throw updateError;
      }

      if (data?.user) {
        setUser(data.user);
      }

      setForm((current) => ({
        ...current,
        name: cleanName,
        organization:
          current.organization.trim(),
        product:
          current.product.trim(),
        location:
          current.location.trim(),
      }));

      setSuccess(
        "Your profile has been saved."
      );
    } catch (saveError) {
      console.error(
        "Unable to save profile:",
        saveError
      );

      setError(
        saveError?.message ||
          "Unable to save your profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    if (signingOut) {
      return;
    }

    setSigningOut(true);
    setError("");

    try {
      const { error: signOutError } =
        await supabase.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      navigate("/login", {
        replace: true,
      });
    } catch (signOutError) {
      console.error(
        "Unable to sign out:",
        signOutError
      );

      setError(
        signOutError?.message ||
          "Unable to sign out. Please try again."
      );

      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <div className="bis-profile-page">
        <style>{profileStyles}</style>

        <Navbar />

        <main className="bis-profile-loading">
          <div className="bis-profile-loading-mark">
            B
          </div>

          <strong>
            Loading your profile
          </strong>

          <span>
            Preparing your BISense workspace...
          </span>

          <div className="bis-profile-loading-dots">
            <i />
            <i />
            <i />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bis-profile-page">
      <style>{profileStyles}</style>

      <Navbar />

      <main className="bis-profile-main">
        <div className="bis-profile-breadcrumb">
          <Link to="/dashboard">
            Dashboard
          </Link>

          <span>/</span>

          <strong>Profile</strong>
        </div>

        <section className="bis-profile-heading">
          <div>
            <span className="bis-profile-kicker">
              ACCOUNT & WORKSPACE
            </span>

            <h1>
              Your BISense profile.
            </h1>

            <p>
              Keep your account context and
              workspace preferences up to date.
            </p>
          </div>

          <Link
            to="/dashboard"
            className="bis-profile-back"
          >
            <span>
              Back to dashboard
            </span>

            <ProfileIcon
              type="arrow"
              size={14}
            />
          </Link>
        </section>

        {error && (
          <div
            className="bis-profile-alert error"
            role="alert"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="bis-profile-alert success"
            role="status"
          >
            <ProfileIcon
              type="check"
              size={14}
            />

            {success}
          </div>
        )}

        <section className="bis-profile-layout">
          <aside className="bis-profile-sidebar">
            <div className="bis-profile-identity">
              <div className="bis-profile-avatar">
                {initials}
              </div>

              <div className="bis-profile-identity-copy">
                <strong>
                  {form.name ||
                    "BISense User"}
                </strong>

                <span>
                  {user?.email ||
                    "No email available"}
                </span>
              </div>

              <span className="bis-profile-role">
                {form.role}
              </span>
            </div>

            <div className="bis-profile-side-divider" />

            <div className="bis-profile-account-status">
              <div className="bis-status-icon">
                <ProfileIcon
                  type="shield"
                  size={15}
                />
              </div>

              <div>
                <strong>
                  Account secured
                </strong>

                <span>
                  Authentication is managed
                  through Supabase.
                </span>
              </div>
            </div>

            <div className="bis-profile-side-links">
              <Link to="/dashboard">
                <span>
                  Workspace
                </span>

                <ProfileIcon
                  type="arrow"
                  size={13}
                />
              </Link>

              <Link to="/standards">
                <span>
                  Saved research
                </span>

                <ProfileIcon
                  type="arrow"
                  size={13}
                />
              </Link>
            </div>
          </aside>

          <section className="bis-profile-editor">
            <div className="bis-profile-editor-header">
              <div>
                <span className="bis-profile-section-label">
                  PERSONAL INFORMATION
                </span>

                <h2>
                  Profile details
                </h2>

                <p>
                  This information helps BISense
                  understand the context in which
                  you use the platform.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSave}
              className="bis-profile-form"
            >
              <div className="bis-profile-field-grid">
                <div className="bis-profile-field full">
                  <label htmlFor="profile-name">
                    Full name
                  </label>

                  <div className="bis-profile-input-wrap">
                    <ProfileIcon
                      type="user"
                      size={15}
                    />

                    <input
                      id="profile-name"
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={
                        handleChange
                      }
                      placeholder="Enter your full name"
                      autoComplete="name"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="bis-profile-field">
                  <label htmlFor="profile-email">
                    Email address
                  </label>

                  <div className="bis-profile-input-wrap disabled">
                    <input
                      id="profile-email"
                      type="email"
                      value={
                        user?.email || ""
                      }
                      disabled
                      readOnly
                    />
                  </div>

                  <small>
                    Your login email is managed
                    by your account.
                  </small>
                </div>

                <div className="bis-profile-field">
                  <label htmlFor="profile-location">
                    Location
                  </label>

                  <div className="bis-profile-input-wrap">
                    <ProfileIcon
                      type="location"
                      size={15}
                    />

                    <input
                      id="profile-location"
                      name="location"
                      type="text"
                      value={
                        form.location
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="City / State"
                      autoComplete="address-level2"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="bis-profile-field">
                  <label htmlFor="profile-organization">
                    Organization
                  </label>

                  <div className="bis-profile-input-wrap">
                    <ProfileIcon
                      type="building"
                      size={15}
                    />

                    <input
                      id="profile-organization"
                      name="organization"
                      type="text"
                      value={
                        form.organization
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Company, college or organization"
                      autoComplete="organization"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="bis-profile-field">
                  <label htmlFor="profile-product">
                    Product / area of interest
                  </label>

                  <div className="bis-profile-input-wrap">
                    <ProfileIcon
                      type="briefcase"
                      size={15}
                    />

                    <input
                      id="profile-product"
                      name="product"
                      type="text"
                      value={
                        form.product
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Product, industry or area"
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              <div className="bis-profile-mode-section">
                <div className="bis-profile-mode-heading">
                  <div>
                    <span className="bis-profile-section-label">
                      WORKSPACE CONTEXT
                    </span>

                    <h3>
                      How are you using BISense?
                    </h3>
                  </div>

                  <span>
                    Used to personalize your
                    workspace.
                  </span>
                </div>

                <div className="bis-profile-mode-options">
                  <button
                    type="button"
                    className={
                      form.role ===
                      "Consumer"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      handleModeChange(
                        "Consumer"
                      )
                    }
                    disabled={saving}
                  >
                    <span className="bis-mode-radio">
                      {form.role ===
                        "Consumer" && (
                        <i />
                      )}
                    </span>

                    <div>
                      <strong>
                        Consumer
                      </strong>

                      <span>
                        Product awareness,
                        BIS marks and
                        consumer information.
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={
                      form.role ===
                      "Manufacturer"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      handleModeChange(
                        "Manufacturer"
                      )
                    }
                    disabled={saving}
                  >
                    <span className="bis-mode-radio">
                      {form.role ===
                        "Manufacturer" && (
                        <i />
                      )}
                    </span>

                    <div>
                      <strong>
                        Manufacturer
                      </strong>

                      <span>
                        Standards,
                        certification,
                        testing and
                        compliance work.
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="bis-profile-form-footer">
                <div>
                  <span>
                    Changes are saved to your
                    BISense account.
                  </span>
                </div>

                <div className="bis-profile-form-actions">
                  <button
                    type="button"
                    className="bis-profile-secondary-btn"
                    onClick={() =>
                      navigate(
                        "/dashboard"
                      )
                    }
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="bis-profile-primary-btn"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="bis-save-spinner" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Save changes
                        <ProfileIcon
                          type="arrow"
                          size={14}
                        />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </section>

        <section className="bis-profile-danger">
          <div>
            <span className="bis-profile-section-label">
              SESSION
            </span>

            <h2>
              Sign out of BISense
            </h2>

            <p>
              End your current session on
              this device.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <ProfileIcon
              type="logout"
              size={14}
            />

            {signingOut
              ? "Signing out..."
              : "Sign out"}
          </button>
        </section>
      </main>
    </div>
  );
}

const profileStyles = `
.bis-profile-page {
  min-height: 100vh;
  width: 100%;
  background: #f6f8fb;
  color: #101828;
  overflow-x: hidden;
}

.bis-profile-main {
  width: min(1080px, calc(100% - 40px));
  margin: 0 auto;
  padding: 42px 0 75px;
}

.bis-profile-breadcrumb {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 25px;
  color: #98a2b3;
  font-size: 10px;
}

.bis-profile-breadcrumb a {
  color: #667085;
  text-decoration: none;
}

.bis-profile-breadcrumb a:hover {
  color: #0b3d91;
}

.bis-profile-breadcrumb strong {
  color: #344054;
  font-weight: 700;
}

.bis-profile-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 30px;
  margin-bottom: 32px;
}

.bis-profile-kicker,
.bis-profile-section-label {
  display: block;
  color: #667085;
  font-size: 9px;
  line-height: 1.2;
  letter-spacing: .14em;
  font-weight: 800;
}

.bis-profile-heading h1 {
  margin: 10px 0 0;
  color: #101828;
  font-size: clamp(36px, 5vw, 52px);
  line-height: 1;
  letter-spacing: -.045em;
  font-weight: 780;
}

.bis-profile-heading p {
  max-width: 650px;
  margin: 12px 0 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.65;
}

.bis-profile-back {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding-bottom: 4px;
  border-bottom: 1px solid #d0d5dd;
  color: #344054;
  font-size: 10px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
  transition:
    color .15s ease,
    border-color .15s ease,
    gap .15s ease;
}

.bis-profile-back:hover {
  color: #0b3d91;
  border-color: #0b3d91;
  gap: 9px;
}

.bis-profile-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
  padding: 11px 13px;
  border: 1px solid;
  border-radius: 8px;
  font-size: 10px;
  line-height: 1.5;
}

.bis-profile-alert.error {
  border-color: #fecdca;
  background: #fff7f6;
  color: #b42318;
}

.bis-profile-alert.success {
  border-color: #abefc6;
  background: #ecfdf3;
  color: #067647;
}

.bis-profile-layout {
  display: grid;
  grid-template-columns: 285px minmax(0, 1fr);
  align-items: start;
  border: 1px solid #dfe4ec;
  border-radius: 12px;
  background: #ffffff;
  overflow: hidden;
  box-shadow:
    0 10px 30px rgba(16,24,40,.04);
}

.bis-profile-sidebar {
  min-width: 0;
  padding: 25px 22px;
  border-right: 1px solid #eaecf0;
  background: #fbfcfe;
}

.bis-profile-identity {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.bis-profile-avatar {
  width: 62px;
  height: 62px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #0b3d91;
  color: #ffffff;
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -.03em;
}

.bis-profile-identity-copy {
  min-width: 0;
  width: 100%;
  margin-top: 14px;
}

.bis-profile-identity-copy strong {
  display: block;
  color: #101828;
  font-size: 14px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.bis-profile-identity-copy span {
  display: block;
  margin-top: 4px;
  color: #667085;
  font-size: 9px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.bis-profile-role {
  display: inline-flex;
  align-items: center;
  min-height: 23px;
  margin-top: 10px;
  padding: 0 8px;
  border: 1px solid #d9e3f1;
  border-radius: 5px;
  background: #f4f8fd;
  color: #0b3d91;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.bis-profile-side-divider {
  height: 1px;
  margin: 23px 0;
  background: #eaecf0;
}

.bis-profile-account-status {
  display: flex;
  align-items: flex-start;
  gap: 9px;
}

.bis-status-icon {
  width: 29px;
  height: 29px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 7px;
  background: #ecfdf3;
  color: #17834d;
}

.bis-profile-account-status strong {
  display: block;
  color: #344054;
  font-size: 9px;
  line-height: 1.4;
}

.bis-profile-account-status span {
  display: block;
  margin-top: 3px;
  color: #98a2b3;
  font-size: 8px;
  line-height: 1.5;
}

.bis-profile-side-links {
  display: flex;
  flex-direction: column;
  margin-top: 26px;
  border-top: 1px solid #eaecf0;
}

.bis-profile-side-links a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 39px;
  border-bottom: 1px solid #eaecf0;
  color: #475467;
  font-size: 9px;
  font-weight: 650;
  text-decoration: none;
  transition: color .15s ease;
}

.bis-profile-side-links a:hover {
  color: #0b3d91;
}

.bis-profile-editor {
  min-width: 0;
  padding: 29px;
}

.bis-profile-editor-header {
  padding-bottom: 21px;
  border-bottom: 1px solid #eaecf0;
}

.bis-profile-editor-header h2 {
  margin: 7px 0 0;
  color: #101828;
  font-size: 21px;
  letter-spacing: -.025em;
}

.bis-profile-editor-header p {
  max-width: 600px;
  margin: 7px 0 0;
  color: #667085;
  font-size: 10px;
  line-height: 1.6;
}

.bis-profile-form {
  padding-top: 23px;
}

.bis-profile-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 19px 15px;
}

.bis-profile-field {
  min-width: 0;
}

.bis-profile-field.full {
  grid-column: 1 / -1;
}

.bis-profile-field label {
  display: block;
  margin-bottom: 7px;
  color: #344054;
  font-size: 10px;
  font-weight: 750;
}

.bis-profile-input-wrap {
  min-width: 0;
  min-height: 43px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 11px;
  border: 1px solid #d0d5dd;
  border-radius: 7px;
  background: #ffffff;
  color: #98a2b3;
  transition:
    border-color .16s ease,
    box-shadow .16s ease;
}

.bis-profile-input-wrap:focus-within {
  border-color: #8aa7d3;
  box-shadow:
    0 0 0 3px rgba(11,61,145,.07);
}

.bis-profile-input-wrap.disabled {
  background: #f9fafb;
  color: #98a2b3;
}

.bis-profile-input-wrap input {
  width: 100%;
  min-width: 0;
  height: 41px;
  border: 0;
  outline: 0;
  background: transparent;
  color: #101828;
  font-family: inherit;
  font-size: 11px;
}

.bis-profile-input-wrap input::placeholder {
  color: #98a2b3;
}

.bis-profile-input-wrap input:disabled {
  color: #667085;
}

.bis-profile-field small {
  display: block;
  margin-top: 5px;
  color: #98a2b3;
  font-size: 8px;
  line-height: 1.4;
}

.bis-profile-mode-section {
  margin-top: 29px;
  padding-top: 23px;
  border-top: 1px solid #eaecf0;
}

.bis-profile-mode-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.bis-profile-mode-heading h3 {
  margin: 7px 0 0;
  color: #101828;
  font-size: 14px;
  letter-spacing: -.015em;
}

.bis-profile-mode-heading > span {
  color: #98a2b3;
  font-size: 8px;
  line-height: 1.45;
  text-align: right;
}

.bis-profile-mode-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 13px;
}

.bis-profile-mode-options > button {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  padding: 13px;
  border: 1px solid #e1e6ed;
  border-radius: 8px;
  background: #ffffff;
  color: #344054;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color .16s ease,
    background-color .16s ease;
}

.bis-profile-mode-options > button:hover:not(:disabled) {
  border-color: #cbd5e1;
  background: #fbfcfe;
}

.bis-profile-mode-options > button.active {
  border-color: #9eb6d9;
  background: #f5f9ff;
}

.bis-profile-mode-options > button:disabled {
  opacity: .55;
  cursor: wait;
}

.bis-mode-radio {
  width: 15px;
  height: 15px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  margin-top: 1px;
  border: 1px solid #cbd5e1;
  border-radius: 50%;
}

.bis-profile-mode-options > button.active .bis-mode-radio {
  border-color: #0b3d91;
}

.bis-mode-radio i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #0b3d91;
}

.bis-profile-mode-options strong {
  display: block;
  color: #101828;
  font-size: 10px;
}

.bis-profile-mode-options span:not(.bis-mode-radio) {
  display: block;
  margin-top: 4px;
  color: #667085;
  font-size: 8px;
  line-height: 1.5;
}

.bis-profile-form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 27px;
  padding-top: 17px;
  border-top: 1px solid #eaecf0;
}

.bis-profile-form-footer > div:first-child span {
  color: #98a2b3;
  font-size: 8px;
}

.bis-profile-form-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bis-profile-secondary-btn,
.bis-profile-primary-btn {
  min-height: 37px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 12px;
  border-radius: 7px;
  font-family: inherit;
  font-size: 9px;
  font-weight: 750;
  cursor: pointer;
  transition:
    background-color .15s ease,
    border-color .15s ease,
    transform .15s ease;
}

.bis-profile-secondary-btn {
  border: 1px solid #d0d5dd;
  background: #ffffff;
  color: #475467;
}

.bis-profile-secondary-btn:hover:not(:disabled) {
  background: #f9fafb;
  transform: translateY(-1px);
}

.bis-profile-primary-btn {
  border: 1px solid #0b3d91;
  background: #0b3d91;
  color: #ffffff;
}

.bis-profile-primary-btn:hover:not(:disabled) {
  background: #082f73;
  transform: translateY(-1px);
}

.bis-profile-secondary-btn:disabled,
.bis-profile-primary-btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.bis-save-spinner {
  width: 11px;
  height: 11px;
  border: 1.5px solid rgba(255,255,255,.35);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: bisProfileSpin .7s linear infinite;
}

@keyframes bisProfileSpin {
  to {
    transform: rotate(360deg);
  }
}

.bis-profile-danger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 25px;
  margin-top: 18px;
  padding: 19px 21px;
  border: 1px solid #e2e6eb;
  border-radius: 10px;
  background: #ffffff;
}

.bis-profile-danger h2 {
  margin: 6px 0 0;
  color: #344054;
  font-size: 13px;
}

.bis-profile-danger p {
  margin: 4px 0 0;
  color: #98a2b3;
  font-size: 9px;
}

.bis-profile-danger button {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 11px;
  border: 1px solid #e4b8b5;
  border-radius: 7px;
  background: #fffafa;
  color: #b42318;
  font-family: inherit;
  font-size: 9px;
  font-weight: 750;
  cursor: pointer;
  transition:
    background-color .15s ease,
    border-color .15s ease;
}

.bis-profile-danger button:hover:not(:disabled) {
  background: #fff5f4;
  border-color: #d99b96;
}

.bis-profile-danger button:disabled {
  opacity: .5;
  cursor: wait;
}

.bis-profile-loading {
  min-height: calc(100vh - 90px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 7px;
  color: #101828;
  text-align: center;
}

.bis-profile-loading-mark {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  margin-bottom: 7px;
  border-radius: 10px;
  background: #0b3d91;
  color: #ffffff;
  font-size: 17px;
  font-weight: 800;
}

.bis-profile-loading strong {
  color: #101828;
  font-size: 12px;
}

.bis-profile-loading > span {
  color: #667085;
  font-size: 9px;
}

.bis-profile-loading-dots {
  display: flex;
  gap: 4px;
  margin-top: 5px;
}

.bis-profile-loading-dots i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #0b3d91;
  animation:
    bisProfileDot
    1s
    ease-in-out
    infinite;
}

.bis-profile-loading-dots i:nth-child(2) {
  animation-delay: .15s;
}

.bis-profile-loading-dots i:nth-child(3) {
  animation-delay: .3s;
}

@keyframes bisProfileDot {
  0%,100% {
    opacity: .25;
    transform: translateY(0);
  }

  50% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

@media (max-width: 800px) {
  .bis-profile-layout {
    grid-template-columns: 1fr;
  }

  .bis-profile-sidebar {
    border-right: 0;
    border-bottom: 1px solid #eaecf0;
  }

  .bis-profile-side-links {
    display: none;
  }

  .bis-profile-mode-options {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .bis-profile-main {
    width: calc(100% - 18px);
    padding-top: 26px;
  }

  .bis-profile-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 15px;
  }

  .bis-profile-heading h1 {
    font-size: 34px;
  }

  .bis-profile-back {
    align-self: flex-start;
  }

  .bis-profile-editor {
    padding: 20px 15px;
  }

  .bis-profile-field-grid {
    grid-template-columns: 1fr;
  }

  .bis-profile-field.full {
    grid-column: auto;
  }

  .bis-profile-mode-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 7px;
  }

  .bis-profile-mode-heading > span {
    text-align: left;
  }

  .bis-profile-form-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .bis-profile-form-actions {
    width: 100%;
  }

  .bis-profile-secondary-btn,
  .bis-profile-primary-btn {
    flex: 1;
  }

  .bis-profile-danger {
    align-items: flex-start;
    flex-direction: column;
  }

  .bis-profile-danger button {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 420px) {
  .bis-profile-sidebar {
    padding: 20px 17px;
  }

  .bis-profile-avatar {
    width: 56px;
    height: 56px;
  }

  .bis-profile-editor-header h2 {
    font-size: 19px;
  }

  .bis-profile-form-actions {
    flex-direction: column;
  }

  .bis-profile-secondary-btn,
  .bis-profile-primary-btn {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
`;