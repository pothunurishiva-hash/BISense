import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../App.css";

const DEFAULT_PROFILE = {
  name: "",
  email: "",
  role: "Consumer",
  organization: "",
  product: "",
  location: "",
};

export default function Profile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          navigate("/login", { replace: true });
          return;
        }

        if (!mounted) return;

        const metadata = user.user_metadata || {};

        setProfile({
          name: metadata.name || "",
          email: user.email || "",
          role: metadata.role || "Consumer",
          organization: metadata.organization || "",
          product: metadata.product || "",
          location: metadata.location || "",
        });
      } catch (err) {
        if (!mounted) return;

        setError(
          err?.message || "Unable to load your profile."
        );
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

  const handleChange = (event) => {
    const { name, value } = event.target;

    setProfile((current) => ({
      ...current,
      [name]: value,
    }));

    setSaved(false);
    setError("");
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      const { error: updateError } =
        await supabase.auth.updateUser({
          data: {
            name: profile.name.trim(),
            role: profile.role,
            organization: profile.organization.trim(),
            product: profile.product.trim(),
            location: profile.location.trim(),
          },
        });

      if (updateError) {
        throw updateError;
      }

      setSaved(true);
    } catch (err) {
      setError(
        err?.message || "Unable to save your profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const avatarLetter =
    profile.name.trim().charAt(0).toUpperCase() || "U";

  if (loading) {
    return (
      <div className="app-page profile-page-wrapper">
        <main className="profile-page">
          <div className="profile-loading">
            <div className="profile-loading-spinner"></div>
            <p>Loading your profile...</p>
          </div>
        </main>

        <style>{`
          .profile-page-wrapper {
            min-height: 100vh;
            background: #f8fafc;
          }

          .profile-loading {
            min-height: 60vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 14px;
            color: #111827;
            text-align: center;
          }

          .profile-loading p {
            color: #111827 !important;
            margin: 0;
          }

          .profile-loading-spinner {
            width: 34px;
            height: 34px;
            border: 3px solid #e5e7eb;
            border-top-color: #111827;
            border-radius: 50%;
            animation: profileSpin 0.8s linear infinite;
          }

          @keyframes profileSpin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app-page profile-page-wrapper">
      <main className="profile-page">
        <section className="profile-hero">
          <div className="profile-hero-top">
            <Link
              to="/"
              className="profile-logo"
              aria-label="BISense Home"
            >
              BIS<span>ense</span>
            </Link>

            <Link
              to="/dashboard"
              className="secondary-btn profile-back-btn"
            >
              ← Back to Dashboard
            </Link>
          </div>

          <div className="profile-intro">
            <p className="eyebrow">PERSONAL PROFILE</p>

            <h1>Your BISense Profile</h1>

            <p>
              Manage your personal information and BISense
              workspace preferences.
            </p>
          </div>
        </section>

        <section className="profile-card">
          <div className="profile-summary">
            <div className="profile-avatar" aria-hidden="true">
              {avatarLetter}
            </div>

            <div className="profile-summary-text">
              <h2>
                {profile.name.trim() || "BISense User"}
              </h2>

              <p>{profile.email || "No email available"}</p>

              <span className="profile-role">
                {profile.role}
              </span>
            </div>
          </div>

          <div className="profile-divider" />

          <form onSubmit={handleSave}>
            <div className="profile-form-grid">
              <div className="profile-field">
                <label htmlFor="profile-name">
                  Full Name
                </label>

                <input
                  id="profile-name"
                  name="name"
                  type="text"
                  value={profile.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  autoComplete="name"
                />
              </div>

              <div className="profile-field">
                <label htmlFor="profile-email">
                  Email
                </label>

                <input
                  id="profile-email"
                  name="email"
                  type="email"
                  value={profile.email}
                  readOnly
                  autoComplete="email"
                  className="profile-readonly"
                />
              </div>

              <div className="profile-field">
                <label htmlFor="profile-role">
                  Workspace Mode
                </label>

                <select
                  id="profile-role"
                  name="role"
                  value={profile.role}
                  onChange={handleChange}
                >
                  <option value="Consumer">
                    Consumer
                  </option>

                  <option value="Manufacturer">
                    Manufacturer
                  </option>
                </select>
              </div>

              <div className="profile-field">
                <label htmlFor="profile-organization">
                  Organization
                </label>

                <input
                  id="profile-organization"
                  name="organization"
                  type="text"
                  value={profile.organization}
                  onChange={handleChange}
                  placeholder="Company, college or organization"
                  autoComplete="organization"
                />
              </div>

              <div className="profile-field">
                <label htmlFor="profile-product">
                  Product / Industry
                </label>

                <input
                  id="profile-product"
                  name="product"
                  type="text"
                  value={profile.product}
                  onChange={handleChange}
                  placeholder="Example: PVC pipes"
                />
              </div>

              <div className="profile-field">
                <label htmlFor="profile-location">
                  Location
                </label>

                <input
                  id="profile-location"
                  name="location"
                  type="text"
                  value={profile.location}
                  onChange={handleChange}
                  placeholder="City / State"
                  autoComplete="address-level2"
                />
              </div>
            </div>

            {error && (
              <div
                className="auth-error profile-error"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="profile-actions">
              <button
                type="submit"
                className="primary-btn"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>

              <Link
                to="/dashboard"
                className="secondary-btn"
              >
                Cancel
              </Link>

              {saved && (
                <span
                  className="profile-save-message"
                  role="status"
                >
                  ✓ Profile saved successfully
                </span>
              )}
            </div>
          </form>
        </section>
      </main>

      <style>{`
        .profile-page-wrapper {
          min-height: 100vh;
          background: #f8fafc;
          color: #111827;
          overflow-x: hidden;
        }

        .profile-page {
          width: 100%;
          box-sizing: border-box;
          color: #111827;
        }

        .profile-hero,
        .profile-card {
          color: #111827;
        }

        .profile-hero h1,
        .profile-hero p,
        .profile-card h2,
        .profile-card p,
        .profile-card label,
        .profile-card strong,
        .profile-summary-text h2,
        .profile-summary-text p {
          color: #111827 !important;
        }

        .profile-logo {
          color: #111827 !important;
          text-decoration: none;
        }

        .profile-logo span {
          color: inherit;
        }

        .profile-back-btn {
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .profile-form-grid {
          width: 100%;
          box-sizing: border-box;
        }

        .profile-field {
          min-width: 0;
        }

        .profile-field label {
          display: block;
          margin-bottom: 7px;
        }

        .profile-field input,
        .profile-field select {
          width: 100%;
          box-sizing: border-box;
          color: #111827 !important;
          background: #ffffff !important;
          -webkit-text-fill-color: #111827 !important;
          border-color: #d1d5db;
        }

        .profile-field input::placeholder {
          color: #6b7280 !important;
          -webkit-text-fill-color: #6b7280 !important;
          opacity: 1;
        }

        .profile-field input:focus,
        .profile-field select:focus {
          color: #111827 !important;
          background: #ffffff !important;
          outline-color: #111827;
        }

        .profile-field select option {
          color: #111827 !important;
          background: #ffffff !important;
        }

        .profile-readonly {
          background: #f3f4f6 !important;
        }

        .profile-role {
          display: inline-flex;
          color: #111827 !important;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 999px;
          padding: 5px 10px;
        }

        .profile-save-message {
          color: #166534 !important;
          font-weight: 600;
        }

        .profile-error {
          color: #991b1b !important;
          overflow-wrap: anywhere;
        }

        .profile-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
        }

        .profile-actions a {
          text-decoration: none;
        }

        @media (max-width: 700px) {
          .profile-page {
            width: 100%;
          }

          .profile-hero,
          .profile-card {
            width: 100%;
            box-sizing: border-box;
          }

          .profile-hero-top {
            gap: 12px;
          }

          .profile-back-btn {
            white-space: nowrap;
          }

          .profile-summary {
            align-items: flex-start;
          }

          .profile-form-grid {
            grid-template-columns: 1fr !important;
          }

          .profile-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .profile-actions > button,
          .profile-actions > a {
            width: 100%;
            min-height: 46px;
          }

          .profile-save-message {
            width: 100%;
            text-align: center;
            box-sizing: border-box;
            padding: 4px 0;
          }
        }

        @media (max-width: 480px) {
          .profile-hero,
          .profile-card {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }

          .profile-hero-top {
            flex-direction: column;
            align-items: stretch !important;
          }

          .profile-logo {
            align-self: flex-start;
          }

          .profile-back-btn {
            width: 100%;
          }

          .profile-summary {
            flex-direction: column;
            align-items: flex-start !important;
          }

          .profile-avatar {
            flex-shrink: 0;
          }

          .profile-summary-text {
            width: 100%;
            min-width: 0;
          }

          .profile-summary-text h2,
          .profile-summary-text p {
            overflow-wrap: anywhere;
            word-break: break-word;
          }
        }
      `}</style>
    </div>
  );
}