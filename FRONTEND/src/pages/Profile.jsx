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
    loadProfile();
  }, []);

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
        navigate("/login");
        return;
      }

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
      setError(
        err?.message || "Unable to load your profile."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setProfile((current) => ({
      ...current,
      [name]: value,
    }));

    setSaved(false);
  };

  const handleSave = async (event) => {
    event.preventDefault();

    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const {
        error: updateError,
      } = await supabase.auth.updateUser({
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

  if (loading) {
    return (
      <div className="app-page">
        <main className="profile-page">
          <div className="profile-loading">
            Loading your profile...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-page">
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
              className="secondary-btn"
            >
              Back to Dashboard
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
            <div className="profile-avatar">
              {profile.name.trim()
                ? profile.name.trim().charAt(0).toUpperCase()
                : "U"}
            </div>

            <div className="profile-summary-text">
              <h2>
                {profile.name.trim() || "BISense User"}
              </h2>

              <p>{profile.email}</p>

              <span className="profile-role">
                {profile.role}
              </span>
            </div>
          </div>

          <div className="profile-divider"></div>

          <form onSubmit={handleSave}>
            <div className="profile-form-grid">
              <div className="profile-field">
                <label htmlFor="name">
                  Full Name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  value={profile.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="profile-field">
                <label htmlFor="email">
                  Email
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={profile.email}
                  readOnly
                />
              </div>

              <div className="profile-field">
                <label htmlFor="role">
                  Workspace Mode
                </label>

                <select
                  id="role"
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
                <label htmlFor="organization">
                  Organization
                </label>

                <input
                  id="organization"
                  name="organization"
                  type="text"
                  value={profile.organization}
                  onChange={handleChange}
                  placeholder="Company, college or organization"
                />
              </div>

              <div className="profile-field">
                <label htmlFor="product">
                  Product / Industry
                </label>

                <input
                  id="product"
                  name="product"
                  type="text"
                  value={profile.product}
                  onChange={handleChange}
                  placeholder="Example: PVC pipes"
                />
              </div>

              <div className="profile-field">
                <label htmlFor="location">
                  Location
                </label>

                <input
                  id="location"
                  name="location"
                  type="text"
                  value={profile.location}
                  onChange={handleChange}
                  placeholder="City / State"
                />
              </div>
            </div>

            {error && (
              <div className="auth-error profile-error">
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
                <span className="profile-save-message">
                  ✓ Profile saved successfully
                </span>
              )}
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}